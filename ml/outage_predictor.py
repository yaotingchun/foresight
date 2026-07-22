"""
Outage predictor — supervised, pre-failure classification (NOT forecasting).

We turn metrics into fixed-length rolling-window feature vectors and train a
GradientBoostingClassifier to answer: "does this window look like the run-up
to an outage?" This is a plain binary classifier over engineered features, not
a time-series/sequence model.

Pipeline:
  1. Feature engineering: for each (component_id, timestamp) in metrics.csv,
     look back over the preceding `window_s` seconds and compute, per feature,
     the mean, std and linear-trend slope -> 5 features x 3 stats = 15 columns.
     Each is also emitted baseline-normalized against that component's own
     historical mean/std (5 x 3 more columns) -- pooling raw metric values
     across components with very different resting profiles (a critical
     service idling at 45% CPU vs. a cache at 2%) risks a single global
     classifier diluting its own signal re-deriving each component's
     "normal" from scratch. In practice, on this project's dataset, this
     normalization moved F1 by well under a point (tree splits are already
     scale-invariant per feature) -- it's kept because it's a low-cost,
     principled feature and does no harm, not because it was the fix.
  2. Labeling: a window is positive (1, "pre-failure") if its timestamp falls in
     [incident.start_time - lead_window_s, incident.start_time) for that
     component; otherwise negative (0). Negatives are subsampled to ~match the
     positive count.
  3. Split by incident (not by row) so a single incident's pre-failure windows
     never straddle train and test.
  4. Train GradientBoostingClassifier.
  5. predict(...) surfaces failure probability + top-2 contributing features
     (via feature_importances_).
  6. evaluate(...) reports precision / recall / F1 on held-out windows plus the
     average lead time before actual failure for correctly predicted incidents.

Input schemas:
  metrics.csv   : timestamp, component_id, cpu_pct, memory_pct, latency_ms,
                  error_rate, log_error_rate_per_min
  incidents.csv : incident_id, component_id, start_time, end_time, fault_type

Runnable standalone:  python outage_predictor.py
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import precision_recall_fscore_support

BASE_FEATURES = [
    "cpu_pct",
    "memory_pct",
    "latency_ms",
    "error_rate",
    "log_error_rate_per_min",
]
STATS = ["mean", "std", "slope"]


def _feature_names(base=BASE_FEATURES, normalize: bool = True) -> list[str]:
    names = [f"{f}_{s}" for f in base for s in STATS]
    if normalize:
        names += [f"{f}_{s}_z" for f in base for s in STATS]
    return names


def compute_component_baselines(
    metrics: pd.DataFrame, base_features=BASE_FEATURES
) -> dict[str, dict[str, tuple[float, float]]]:
    """Per-component (mean, std) for each base feature, over its full history.

    This is the same baseline outage_detector.py fits per component; reusing
    the idea here lets the predictor's window stats be interpreted relative to
    what's normal for THAT component instead of pooled in absolute units.
    """
    baselines: dict[str, dict[str, tuple[float, float]]] = {}
    for component_id, group in metrics.groupby("component_id"):
        baselines[component_id] = {}
        for f in base_features:
            vals = group[f].astype(float).to_numpy()
            mean = float(vals.mean())
            std = float(vals.std(ddof=0))
            baselines[component_id][f] = (mean, std if std > 1e-9 else 1.0)
    return baselines


def _slope(times_s: np.ndarray, values: np.ndarray) -> float:
    """Linear-trend slope (value units per second) via least squares."""
    if len(values) < 2:
        return 0.0
    t = times_s - times_s.mean()
    denom = float((t * t).sum())
    if denom < 1e-12:
        return 0.0
    return float((t * (values - values.mean())).sum() / denom)


def build_window_features(
    metrics: pd.DataFrame,
    window_s: int = 30,
    base_features=BASE_FEATURES,
    baselines: dict[str, dict[str, tuple[float, float]]] | None = None,
) -> pd.DataFrame:
    """Compute rolling-window (preceding `window_s` s) features per row.

    Returns one row per (component_id, timestamp) with the engineered columns
    plus `component_id` and `timestamp`. If `baselines` is given (see
    `compute_component_baselines`), also emits `{feature}_{stat}_z` columns:
    the raw stat expressed in units of that component's own baseline std, so
    the same relative deviation reads the same regardless of which component
    it came from.
    """
    metrics = metrics.copy()
    metrics["timestamp"] = pd.to_datetime(metrics["timestamp"], utc=True)
    metrics = metrics.sort_values(["component_id", "timestamp"])

    out_rows: list[dict] = []
    for component_id, group in metrics.groupby("component_id"):
        ts = group["timestamp"].astype("int64").to_numpy() / 1e9  # epoch seconds
        feat_arrays = {f: group[f].astype(float).to_numpy() for f in base_features}
        n = len(ts)
        comp_baseline = baselines.get(component_id) if baselines else None
        # window includes rows in (t - window_s, t]; searchsorted on sorted ts.
        left_idx = np.searchsorted(ts, ts - window_s, side="right")
        for i in range(n):
            lo = left_idx[i]
            sl = slice(lo, i + 1)
            win_t = ts[sl]
            rec = {"component_id": component_id, "timestamp": group["timestamp"].iloc[i]}
            for f in base_features:
                vals = feat_arrays[f][sl]
                mean = float(vals.mean())
                std = float(vals.std(ddof=0)) if len(vals) > 1 else 0.0
                slope = _slope(win_t, vals)
                rec[f"{f}_mean"] = mean
                rec[f"{f}_std"] = std
                rec[f"{f}_slope"] = slope
                if comp_baseline is not None:
                    base_mean, base_std = comp_baseline[f]
                    rec[f"{f}_mean_z"] = (mean - base_mean) / base_std
                    rec[f"{f}_std_z"] = std / base_std
                    rec[f"{f}_slope_z"] = slope / base_std
            out_rows.append(rec)

    return pd.DataFrame(out_rows)


def label_windows(
    windows: pd.DataFrame,
    incidents: pd.DataFrame,
    lead_window_s: int = 300,
) -> pd.DataFrame:
    """Attach `label` (0/1) and `incident_id` (source incident or None).

    Positive = timestamp in [start_time - lead_window_s, start_time) for the
    same component.
    """
    windows = windows.copy()
    windows["timestamp"] = pd.to_datetime(windows["timestamp"], utc=True)
    windows["label"] = 0
    windows["incident_id"] = None

    inc = incidents.copy()
    inc["start_time"] = pd.to_datetime(inc["start_time"], utc=True)

    for _, incident in inc.iterrows():
        comp = incident["component_id"]
        start = incident["start_time"]
        lo = start - pd.Timedelta(seconds=lead_window_s)
        mask = (
            (windows["component_id"] == comp)
            & (windows["timestamp"] >= lo)
            & (windows["timestamp"] < start)
        )
        windows.loc[mask, "label"] = 1
        windows.loc[mask, "incident_id"] = incident["incident_id"]
    return windows


def balance_negatives(
    labeled: pd.DataFrame, ratio: float = 1.0, random_state: int = 42
) -> pd.DataFrame:
    """Subsample negatives to ~`ratio` * (#positives)."""
    pos = labeled[labeled.label == 1]
    neg = labeled[labeled.label == 0]
    n_keep = min(len(neg), max(1, int(round(len(pos) * ratio))))
    if len(neg) > n_keep:
        neg = neg.sample(n=n_keep, random_state=random_state)
    return pd.concat([pos, neg]).sort_values("timestamp").reset_index(drop=True)


class OutagePredictor:
    def __init__(
        self,
        window_s: int = 30,
        lead_window_s: int = 300,
        threshold: float = 0.7,
        random_state: int = 42,
        normalize: bool = True,
    ):
        self.window_s = window_s
        self.lead_window_s = lead_window_s
        self.threshold = threshold
        self.random_state = random_state
        self.normalize = normalize
        self.feature_names = _feature_names(normalize=normalize)
        self.model: GradientBoostingClassifier | None = None
        self._test_frame: pd.DataFrame | None = None
        self._incidents: pd.DataFrame | None = None
        self._baselines: dict | None = None

    # -------------------------------------------------------------- prepare
    def prepare(self, metrics: pd.DataFrame, incidents: pd.DataFrame) -> pd.DataFrame:
        baselines = None
        if self.normalize:
            # Reuse baselines from a prior fit() if available so a new window
            # is scored against the SAME "normal" the model was trained on;
            # otherwise (e.g. calling prepare() standalone) derive them fresh
            # from whatever metrics history is given.
            baselines = self._baselines or compute_component_baselines(metrics)
        windows = build_window_features(metrics, self.window_s, baselines=baselines)
        labeled = label_windows(windows, incidents, self.lead_window_s)
        return labeled

    def _split_by_incident(self, labeled: pd.DataFrame, test_frac: float):
        """Split so no incident's pre-failure windows leak across train/test."""
        incident_ids = [i for i in labeled.incident_id.dropna().unique()]
        rng = np.random.default_rng(self.random_state)
        rng.shuffle(incident_ids)
        n_test = max(1, int(round(len(incident_ids) * test_frac)))
        test_incidents = set(incident_ids[:n_test])

        is_test_pos = labeled.incident_id.isin(test_incidents)
        # Negatives (incident_id is None) are split by hashing timestamp so the
        # split is deterministic and independent of any incident grouping.
        neg_mask = labeled.incident_id.isna()
        epoch_s = labeled["timestamp"].astype("int64") // 1_000_000_000
        neg_to_test = neg_mask & ((epoch_s % 100) < int(test_frac * 100))

        test_mask = is_test_pos | neg_to_test
        return labeled[~test_mask].copy(), labeled[test_mask].copy(), test_incidents

    # ------------------------------------------------------------------ fit
    def fit(
        self,
        metrics: pd.DataFrame,
        incidents: pd.DataFrame,
        test_frac: float = 0.3,
    ) -> "OutagePredictor":
        self._incidents = incidents.copy()
        self._incidents["start_time"] = pd.to_datetime(
            self._incidents["start_time"], utc=True
        )
        if self.normalize:
            # Fit baselines once, from training data, and reuse them for every
            # later prepare()/predict() call -- a new window must be scored
            # against the same "normal" the model learned against.
            self._baselines = compute_component_baselines(metrics)

        labeled = self.prepare(metrics, incidents)
        train_raw, test_raw, _ = self._split_by_incident(labeled, test_frac)

        train = balance_negatives(train_raw, ratio=1.0, random_state=self.random_state)

        X_train = train[self.feature_names].to_numpy()
        y_train = train["label"].to_numpy()

        self.model = GradientBoostingClassifier(random_state=self.random_state)
        self.model.fit(X_train, y_train)

        # Keep the (unbalanced) held-out frame for honest evaluation.
        self._test_frame = test_raw.reset_index(drop=True)
        return self

    # -------------------------------------------------------------- predict
    def predict(self, component_id: str, current_window_features) -> dict:
        """Predict failure probability for one engineered window.

        `current_window_features` may be a dict / Series / 1-row DataFrame keyed
        by the engineered feature names, or a raw sequence in feature order.
        """
        if self.model is None:
            raise RuntimeError("call fit() before predict()")

        x, ts = self._coerce_features(current_window_features)
        proba = float(self.model.predict_proba(x.reshape(1, -1))[0, 1])
        top = self._top_features(x)
        return {
            "component_id": component_id,
            "failure_probability": round(proba, 4),
            "top_contributing_features": top,
            "timestamp": ts,
        }

    def _coerce_features(self, feats):
        ts = None
        if isinstance(feats, dict):
            ts = feats.get("timestamp")
            x = np.array([float(feats[f]) for f in self.feature_names])
        elif isinstance(feats, pd.Series):
            ts = feats.get("timestamp")
            x = feats[self.feature_names].to_numpy(dtype=float)
        elif isinstance(feats, pd.DataFrame):
            ts = feats.iloc[0].get("timestamp") if "timestamp" in feats else None
            x = feats.iloc[0][self.feature_names].to_numpy(dtype=float)
        else:
            x = np.asarray(feats, dtype=float)
        return x, ts

    def _top_features(self, x: np.ndarray, k: int = 2) -> list[dict]:
        """Top-k features by global importance, reported with this row's value."""
        importances = self.model.feature_importances_
        order = np.argsort(importances)[::-1][:k]
        return [
            {
                "feature": self.feature_names[i],
                "importance": round(float(importances[i]), 4),
                "value": round(float(x[i]), 4),
            }
            for i in order
        ]

    # ------------------------------------------------------------- evaluate
    def evaluate(self, test_frame: pd.DataFrame | None = None) -> dict:
        """Precision / recall / F1 on held-out windows + average lead time."""
        if self.model is None:
            raise RuntimeError("call fit() before evaluate()")
        test = self._test_frame if test_frame is None else test_frame
        if test is None or test.empty:
            return {"error": "no held-out data to evaluate"}

        X = test[self.feature_names].to_numpy()
        y_true = test["label"].to_numpy()
        proba = self.model.predict_proba(X)[:, 1]
        y_pred = (proba >= self.threshold).astype(int)

        precision, recall, f1, _ = precision_recall_fscore_support(
            y_true, y_pred, average="binary", zero_division=0
        )

        lead = self._average_lead_time(test, proba)
        return {
            "precision": round(float(precision), 4),
            "recall": round(float(recall), 4),
            "f1": round(float(f1), 4),
            "threshold": self.threshold,
            "avg_lead_time_s": lead["avg_lead_time_s"],
            "incidents_correctly_predicted": lead["n_predicted"],
            "incidents_in_test": lead["n_incidents"],
            "n_test_windows": int(len(test)),
        }

    def _average_lead_time(self, test: pd.DataFrame, proba: np.ndarray) -> dict:
        """For each test incident, seconds between actual start_time and the
        FIRST pre-failure window whose probability crossed `threshold`."""
        test = test.copy()
        test["proba"] = proba
        inc_lookup = self._incidents.set_index("incident_id")["start_time"].to_dict()

        leads: list[float] = []
        test_incidents = test.loc[test.label == 1, "incident_id"].dropna().unique()
        for inc_id in test_incidents:
            rows = test[(test.incident_id == inc_id) & (test.label == 1)]
            crossed = rows[rows.proba >= self.threshold]
            if crossed.empty:
                continue  # incident not predicted -> excluded from lead-time avg
            first_ts = crossed["timestamp"].min()
            start = inc_lookup[inc_id]
            leads.append((start - first_ts).total_seconds())

        return {
            "avg_lead_time_s": round(float(np.mean(leads)), 1) if leads else None,
            "n_predicted": len(leads),
            "n_incidents": int(len(test_incidents)),
        }


# --------------------------------------------------------------------------- #
# Standalone sanity check
# --------------------------------------------------------------------------- #
def _dummy_data():
    """Synthesize metrics with clear pre-failure ramps + matching incidents."""
    rng = np.random.default_rng(1)
    base = pd.Timestamp("2026-07-19T14:00:00Z")
    step = 20  # seconds between samples
    comps = ["api-gateway", "payment-service", "order-service"]

    incidents = []
    metric_rows = []
    inc_counter = 0
    for comp in comps:
        # two incidents per component at fixed offsets
        for k in range(2):
            inc_counter += 1
            start_offset = 1200 + k * 1800  # seconds into the series
            start = base + pd.Timedelta(seconds=start_offset)
            incidents.append(
                {
                    "incident_id": f"inc-{inc_counter:03d}",
                    "component_id": comp,
                    "start_time": start,
                    "end_time": start + pd.Timedelta(seconds=300),
                    "fault_type": "cpu_saturation",
                }
            )

        n = 300
        for i in range(n):
            t = base + pd.Timedelta(seconds=step * i)
            cpu, err, lat = 35.0, 0.3, 24.0
            # add a ramp in the 300s before each incident start
            for inc in incidents:
                if inc["component_id"] != comp:
                    continue
                lead0 = inc["start_time"] - pd.Timedelta(seconds=300)
                if lead0 <= t < inc["start_time"]:
                    frac = (t - lead0).total_seconds() / 300.0
                    cpu += 55 * frac
                    err += 4.0 * frac
                    lat += 90 * frac
            metric_rows.append(
                {
                    "timestamp": t,
                    "component_id": comp,
                    "cpu_pct": cpu + rng.normal(0, 1.5),
                    "memory_pct": 45 + rng.normal(0, 2),
                    "latency_ms": lat + rng.normal(0, 1.5),
                    "error_rate": max(0, err + rng.normal(0, 0.05)),
                    "log_error_rate_per_min": max(0, 2 + err + rng.normal(0, 0.2)),
                }
            )

    return pd.DataFrame(metric_rows), pd.DataFrame(incidents)


if __name__ == "__main__":
    metrics, incidents = _dummy_data()
    print("=== OutagePredictor sanity check (hand-built dummy dataframe) ===")
    print(f"metrics rows={len(metrics)}  incidents={len(incidents)}")

    predictor = OutagePredictor(window_s=30, lead_window_s=300, threshold=0.7)
    predictor.fit(metrics, incidents, test_frac=0.34)

    # A demo prediction taken from a known pre-failure window.
    labeled = predictor.prepare(metrics, incidents)
    demo_pos = labeled[labeled.label == 1].iloc[-1]
    pred = predictor.predict(demo_pos["component_id"], demo_pos)
    print("\npredict(pre-failure window) ->")
    for key, val in pred.items():
        print(f"  {key}: {val}")

    print("\nevaluate(held-out incidents) ->")
    for key, val in predictor.evaluate().items():
        print(f"  {key}: {val}")
