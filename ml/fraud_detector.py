"""
Fraud detector — supervised RandomForest on labelled transactions.

Because `is_fraud_label` is available, this is a straight supervised classifier.
Features are computed CAUSALLY (only from a transaction's own past) so nothing
leaks from the future — both at training time and at inference time:

  - amount                : the raw transaction amount
  - amount_z              : deviation of amount from the account's historical
                            mean/std (z-score over prior transactions only)
  - seconds_since_last    : time since this account's previous transaction
  - dest_is_new           : 1 if this source_account has never paid this
                            dest_account before, else 0

Input schema (transactions.csv):
    timestamp, transaction_id, account_id, amount,
    source_account, dest_account, is_fraud_label

Runnable standalone:  python fraud_detector.py
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import precision_recall_fscore_support

FEATURES = ["amount", "amount_z", "seconds_since_last", "dest_is_new"]


def build_transaction_features(txns: pd.DataFrame) -> pd.DataFrame:
    """Add causal per-transaction features. Input must be the raw schema."""
    df = txns.copy()
    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True)
    df = df.sort_values("timestamp").reset_index(drop=True)

    # Running per-account amount stats (prior transactions only).
    amount_z = np.zeros(len(df))
    seconds_since_last = np.zeros(len(df))
    dest_is_new = np.zeros(len(df), dtype=int)

    acct_count: dict = {}
    acct_sum: dict = {}
    acct_sumsq: dict = {}
    acct_last_time: dict = {}
    seen_pairs: set = set()

    for pos, row in enumerate(df.itertuples(index=False)):
        acct = row.account_id
        src = row.source_account
        dst = row.dest_account
        amt = float(row.amount)
        t = row.timestamp

        # amount_z vs this account's prior history
        n = acct_count.get(acct, 0)
        if n >= 2:
            mean = acct_sum[acct] / n
            var = max(acct_sumsq[acct] / n - mean * mean, 0.0)
            std = np.sqrt(var)
            amount_z[pos] = (amt - mean) / std if std > 1e-9 else 0.0
        else:
            amount_z[pos] = 0.0

        # seconds since this account's previous transaction
        last_t = acct_last_time.get(acct)
        seconds_since_last[pos] = (
            (t - last_t).total_seconds() if last_t is not None else -1.0
        )

        # is this (source -> dest) pair new for this source?
        pair = (src, dst)
        dest_is_new[pos] = 0 if pair in seen_pairs else 1

        # update running state AFTER scoring this row (keeps it causal)
        acct_count[acct] = n + 1
        acct_sum[acct] = acct_sum.get(acct, 0.0) + amt
        acct_sumsq[acct] = acct_sumsq.get(acct, 0.0) + amt * amt
        acct_last_time[acct] = t
        seen_pairs.add(pair)

    df["amount_z"] = amount_z
    df["seconds_since_last"] = seconds_since_last
    df["dest_is_new"] = dest_is_new
    return df


class FraudDetector:
    def __init__(self, random_state: int = 42, n_estimators: int = 200):
        self.random_state = random_state
        self.n_estimators = n_estimators
        self.features = list(FEATURES)
        self.model: RandomForestClassifier | None = None
        self._train_std: np.ndarray | None = None  # for per-txn contribution
        # account profiles carried from training, so predict() can featurize a
        # single incoming transaction the same causal way.
        self._acct_profile: dict = {}
        self._seen_pairs: set = set()

    # ------------------------------------------------------------------ fit
    def fit(self, txns: pd.DataFrame) -> "FraudDetector":
        feat = build_transaction_features(txns)
        X = feat[self.features].to_numpy()
        y = feat["is_fraud_label"].astype(int).to_numpy()

        self.model = RandomForestClassifier(
            n_estimators=self.n_estimators,
            random_state=self.random_state,
            class_weight="balanced",
        )
        self.model.fit(X, y)
        self._train_std = X.std(axis=0)
        self._train_std[self._train_std < 1e-9] = 1.0
        self._store_profiles(feat)
        return self

    def _store_profiles(self, feat: pd.DataFrame) -> None:
        """Snapshot final per-account state for single-transaction scoring."""
        for acct, g in feat.groupby("account_id"):
            amts = g["amount"].to_numpy(dtype=float)
            self._acct_profile[acct] = {
                "count": len(amts),
                "mean": float(amts.mean()),
                "std": float(amts.std(ddof=0)),
                "last_time": pd.to_datetime(g["timestamp"], utc=True).max(),
            }
        self._seen_pairs = set(
            zip(feat["source_account"], feat["dest_account"])
        )

    # -------------------------------------------------------------- predict
    def predict(self, transaction: dict | pd.Series) -> dict:
        """Score one raw transaction dict/Series against stored account history."""
        if self.model is None:
            raise RuntimeError("call fit() before predict()")
        tx = dict(transaction)
        x = self._featurize_single(tx)
        proba = float(self.model.predict_proba(x.reshape(1, -1))[0, 1])
        return {
            "transaction_id": tx.get("transaction_id"),
            "fraud_probability": round(proba, 4),
            "top_contributing_features": self._top_features(x),
        }

    def _featurize_single(self, tx: dict) -> np.ndarray:
        amt = float(tx["amount"])
        acct = tx.get("account_id")
        src = tx.get("source_account")
        dst = tx.get("dest_account")

        prof = self._acct_profile.get(acct)
        if prof and prof["count"] >= 2 and prof["std"] > 1e-9:
            amount_z = (amt - prof["mean"]) / prof["std"]
        else:
            amount_z = 0.0

        if prof and prof["last_time"] is not None and tx.get("timestamp") is not None:
            t = pd.to_datetime(tx["timestamp"], utc=True)
            seconds_since_last = (t - prof["last_time"]).total_seconds()
        else:
            seconds_since_last = -1.0

        dest_is_new = 0 if (src, dst) in self._seen_pairs else 1
        return np.array([amt, amount_z, seconds_since_last, dest_is_new], dtype=float)

    def _top_features(self, x: np.ndarray, k: int = 2) -> list[dict]:
        """Per-transaction top features: importance x standardized magnitude."""
        importances = self.model.feature_importances_
        contribution = importances * np.abs(x / self._train_std)
        order = np.argsort(contribution)[::-1][:k]
        return [
            {
                "feature": self.features[i],
                "importance": round(float(importances[i]), 4),
                "value": round(float(x[i]), 4),
            }
            for i in order
        ]

    # ------------------------------------------------------------- evaluate
    @staticmethod
    def evaluate(
        txns: pd.DataFrame,
        test_frac: float = 0.3,
        random_state: int = 42,
        n_estimators: int = 200,
    ) -> dict:
        """Standalone eval: causal features, time-ordered held-out split,
        precision / recall / F1 against is_fraud_label."""
        feat = build_transaction_features(txns)  # already time-sorted
        n = len(feat)
        split = int(n * (1 - test_frac))
        train, test = feat.iloc[:split], feat.iloc[split:]

        X_tr, y_tr = train[FEATURES].to_numpy(), train["is_fraud_label"].astype(int)
        X_te, y_te = test[FEATURES].to_numpy(), test["is_fraud_label"].astype(int)

        model = RandomForestClassifier(
            n_estimators=n_estimators,
            random_state=random_state,
            class_weight="balanced",
        )
        model.fit(X_tr, y_tr)
        y_pred = model.predict(X_te)

        precision, recall, f1, _ = precision_recall_fscore_support(
            y_te, y_pred, average="binary", zero_division=0
        )
        return {
            "precision": round(float(precision), 4),
            "recall": round(float(recall), 4),
            "f1": round(float(f1), 4),
            "n_train": int(len(train)),
            "n_test": int(len(test)),
            "test_fraud_count": int(y_te.sum()),
        }


# --------------------------------------------------------------------------- #
# Standalone sanity check
# --------------------------------------------------------------------------- #
def _dummy_transactions() -> pd.DataFrame:
    rng = np.random.default_rng(2)
    base = pd.Timestamp("2026-07-19T14:00:00Z")
    accounts = [f"ACC-{i:04d}" for i in range(20)]
    known_dest = [f"ACC-{i:04d}" for i in range(20, 40)]
    rows = []
    tcount = 0
    t = base
    for _ in range(1000):
        t = t + pd.Timedelta(seconds=float(rng.integers(20, 300)))
        acct = rng.choice(accounts)
        is_fraud = rng.random() < 0.06
        if is_fraud:
            amount = float(rng.normal(4000, 800))  # large
            dest = f"EXT-{rng.integers(0, 9999):04d}"  # brand-new external
        else:
            amount = float(abs(rng.normal(180, 60)))
            dest = rng.choice(known_dest)
        tcount += 1
        rows.append(
            {
                "timestamp": t,
                "transaction_id": f"tx-{tcount:05d}",
                "account_id": acct,
                "amount": round(amount, 2),
                "source_account": acct,
                "dest_account": dest,
                "is_fraud_label": int(is_fraud),
            }
        )
    return pd.DataFrame(rows)


if __name__ == "__main__":
    txns = _dummy_transactions()
    print("=== FraudDetector sanity check (hand-built dummy dataframe) ===")
    print(f"transactions={len(txns)}  fraud={int(txns.is_fraud_label.sum())}")

    detector = FraudDetector().fit(txns)

    fraud_demo = {
        "timestamp": "2026-07-20T09:00:00Z",
        "transaction_id": "tx-DEMO1",
        "account_id": "ACC-0003",
        "amount": 5200.0,
        "source_account": "ACC-0003",
        "dest_account": "EXT-9999",
        "is_fraud_label": None,
    }
    legit_demo = {
        "timestamp": "2026-07-20T09:05:00Z",
        "transaction_id": "tx-DEMO2",
        "account_id": "ACC-0003",
        "amount": 175.0,
        "source_account": "ACC-0003",
        "dest_account": "ACC-0021",
        "is_fraud_label": None,
    }
    print("\npredict(suspicious) ->", detector.predict(fraud_demo))
    print("predict(normal)     ->", detector.predict(legit_demo))

    print("\nevaluate(held-out split) ->")
    for key, val in FraudDetector.evaluate(txns).items():
        print(f"  {key}: {val}")
