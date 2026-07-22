"""
Outage detector — unsupervised, per-component anomaly detection on infra metrics.

Approach (per component):
  1. Fit a per-feature baseline (mean / std) from that component's own history.
  2. Fit an IsolationForest on the raw feature set.

A row is flagged anomalous only if BOTH:
  (a) it exceeds a z-score threshold (default 2.5) on at least one feature
      against that component's own baseline, AND
  (b) it is flagged as an outlier by the IsolationForest.

This "AND" gate keeps the detector conservative: the z-score guarantees the
anomaly is interpretable (a real deviation on a named feature) while the
IsolationForest guards against flagging every mild single-feature wobble.

Input schema (metrics.csv):
    timestamp, component_id, cpu_pct, memory_pct, latency_ms,
    error_rate, log_error_rate_per_min

Runnable standalone:  python outage_detector.py
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

FEATURES = [
    "cpu_pct",
    "memory_pct",
    "latency_ms",
    "error_rate",
    "log_error_rate_per_min",
]


class OutageDetector:
    """Per-component Isolation Forest + z-score baseline outage detector."""

    def __init__(
        self,
        features: list[str] | None = None,
        z_threshold: float = 2.5,
        contamination: float = 0.02,
        random_state: int = 42,
    ):
        self.features = list(features) if features else list(FEATURES)
        self.z_threshold = z_threshold
        self.contamination = contamination
        self.random_state = random_state
        # component_id -> {"mean": Series, "std": Series, "model": IsolationForest}
        self._models: dict[str, dict] = {}

    # ------------------------------------------------------------------ fit
    def fit(self, df: pd.DataFrame) -> "OutageDetector":
        """Fit one baseline + IsolationForest per component_id."""
        self._validate(df)
        for component_id, group in df.groupby("component_id"):
            X = group[self.features].astype(float)
            mean = X.mean()
            # ddof=0 keeps a defined std even for tiny groups; guard zeros below.
            std = X.std(ddof=0).replace(0.0, np.nan)

            model = IsolationForest(
                contamination=self.contamination,
                random_state=self.random_state,
                n_estimators=200,
            )
            model.fit(X.values)

            self._models[component_id] = {
                "mean": mean,
                "std": std,
                "model": model,
                "n": len(group),
            }
        return self

    # ------------------------------------------------------------- scoring
    def score_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """Batch-score a dataframe and return ONLY the flagged rows.

        Returns a dataframe with columns:
            component_id, timestamp, confidence, explanation
        """
        self._validate(df)
        records: list[dict] = []
        for component_id, group in df.groupby("component_id"):
            state = self._models.get(component_id)
            if state is None:
                # No baseline for this component -> cannot score it.
                continue

            X = group[self.features].astype(float)
            mean, std = state["mean"], state["std"]
            model = state["model"]

            # (a) z-scores against this component's own baseline.
            z = (X - mean) / std
            z = z.replace([np.inf, -np.inf], np.nan).fillna(0.0)
            abs_z = z.abs()
            max_z = abs_z.max(axis=1)
            z_flag = max_z >= self.z_threshold

            # (b) IsolationForest outlier flag (-1 == outlier).
            if_pred = model.predict(X.values) == -1
            # score_samples: lower == more anomalous. Normalise to a 0..1 signal.
            if_raw = model.score_samples(X.values)

            flagged = z_flag.values & if_pred
            if not flagged.any():
                continue

            confidence = self._confidence(max_z.values, if_raw)
            timestamps = group["timestamp"].values
            for i in np.flatnonzero(flagged):
                records.append(
                    {
                        "component_id": component_id,
                        "timestamp": timestamps[i],
                        "confidence": round(float(confidence[i]), 4),
                        "explanation": self._explain(abs_z.iloc[i], z.iloc[i]),
                    }
                )

        cols = ["component_id", "timestamp", "confidence", "explanation"]
        if not records:
            return pd.DataFrame(columns=cols)
        return pd.DataFrame(records, columns=cols).sort_values(
            "confidence", ascending=False, ignore_index=True
        )

    def score_row(self, row: dict | pd.Series) -> dict | None:
        """Score a single metrics row. Returns a flag dict or None if normal."""
        row = pd.Series(row)
        one = pd.DataFrame([row])
        out = self.score_dataframe(one)
        if out.empty:
            return None
        return out.iloc[0].to_dict()

    # ----------------------------------------------------------- internals
    def _confidence(self, max_z: np.ndarray, if_raw: np.ndarray) -> np.ndarray:
        """Blend z-magnitude and IsolationForest score into a 0..1 confidence."""
        # z component: saturates at ~2x the threshold.
        z_part = np.clip(max_z / (2.0 * self.z_threshold), 0.0, 1.0)
        # IF component: score_samples is roughly in [-0.5, 0]; more negative =
        # more anomalous. Map to 0..1 with a stable min-max over this batch.
        lo, hi = if_raw.min(), if_raw.max()
        if hi - lo < 1e-9:
            if_part = np.full_like(if_raw, 0.5, dtype=float)
        else:
            if_part = 1.0 - (if_raw - lo) / (hi - lo)
        return 0.5 * z_part + 0.5 * if_part

    def _explain(self, abs_z_row: pd.Series, z_row: pd.Series) -> str:
        """Name the top 1-2 features by absolute z-score deviation."""
        top = abs_z_row.sort_values(ascending=False)
        top = top[top >= self.z_threshold].head(2)
        if top.empty:  # fall back to the single largest deviation
            top = abs_z_row.sort_values(ascending=False).head(1)
        parts = []
        for feat in top.index:
            direction = "high" if z_row[feat] > 0 else "low"
            parts.append(f"{feat} {direction} (z={z_row[feat]:+.1f})")
        return "; ".join(parts)

    def _validate(self, df: pd.DataFrame) -> None:
        missing = {"component_id", "timestamp", *self.features} - set(df.columns)
        if missing:
            raise ValueError(f"metrics dataframe missing columns: {sorted(missing)}")


# --------------------------------------------------------------------------- #
# Standalone sanity check
# --------------------------------------------------------------------------- #
def _dummy_metrics() -> pd.DataFrame:
    """Build a tiny metrics dataframe matching the metrics.csv schema."""
    rng = np.random.default_rng(0)
    rows = []
    base = pd.Timestamp("2026-07-19T14:00:00Z")
    for comp in ["api-gateway", "payment-service"]:
        for i in range(60):
            rows.append(
                {
                    "timestamp": base + pd.Timedelta(seconds=40 * i),
                    "component_id": comp,
                    "cpu_pct": rng.normal(35, 3),
                    "memory_pct": rng.normal(45, 4),
                    "latency_ms": rng.normal(24, 2),
                    "error_rate": abs(rng.normal(0.3, 0.05)),
                    "log_error_rate_per_min": abs(rng.normal(2.0, 0.4)),
                }
            )
    df = pd.DataFrame(rows)
    # Inject a clear anomaly: latency + error spike on api-gateway.
    spike = df.index[(df.component_id == "api-gateway")][50]
    df.loc[spike, ["latency_ms", "error_rate", "cpu_pct"]] = [120.0, 4.5, 92.0]
    return df


def _try_load_real() -> pd.DataFrame | None:
    """Best-effort load of the real metrics.csv if present next to /data."""
    import os

    for path in ("data/metrics.csv", "../data/metrics.csv"):
        if os.path.exists(path):
            df = pd.read_csv(path, parse_dates=["timestamp"])
            if set(FEATURES).issubset(df.columns):
                return df
    return None


if __name__ == "__main__":
    df = _try_load_real()
    source = "real metrics.csv"
    if df is None:
        df = _dummy_metrics()
        source = "hand-built dummy dataframe"

    print(f"=== OutageDetector sanity check ({source}) ===")
    print(f"rows={len(df)}  components={df.component_id.nunique()}")

    det = OutageDetector(z_threshold=2.5).fit(df)
    flagged = det.score_dataframe(df)

    print(f"\nflagged rows: {len(flagged)}")
    with pd.option_context("display.max_colwidth", 60, "display.width", 120):
        print(flagged.head(10).to_string(index=False))

    # Single-row demo
    demo = {
        "component_id": "api-gateway",
        "timestamp": "2026-07-19T15:00:00Z",
        "cpu_pct": 95.0,
        "memory_pct": 47.0,
        "latency_ms": 140.0,
        "error_rate": 5.0,
        "log_error_rate_per_min": 3.0,
    }
    print("\nscore_row(anomalous demo) ->")
    print(" ", det.score_row(demo))
