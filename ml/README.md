# ML layer — IT + financial anomaly prediction

Four independent, composable modules. No shared state, no framework — each is a
plain class/function set you can import individually from a pipeline script.
Only `scikit-learn`, `pandas`, `numpy` are used (no deep learning, no time-series
libs).

Every module is runnable standalone and prints a readable sanity check
(sample predictions + eval metrics) built on a small hand-made dummy dataframe
in the documented CSV schema:

```bash
python outage_detector.py
python outage_predictor.py
python fraud_detector.py
python infra_correlation.py
```

## Modules

| File | Type | Model | Answers |
|------|------|-------|---------|
| `outage_detector.py` | Unsupervised | IsolationForest + per-component z-score baseline | "Is this metrics row anomalous *right now*?" |
| `outage_predictor.py` | Supervised | GradientBoostingClassifier | "Does this window look like the run-up to an outage?" |
| `fraud_detector.py` | Supervised | RandomForestClassifier | "Is this transaction fraud?" |
| `infra_correlation.py` | Deterministic (no ML) | rule engine over incidents + topology | "Is a flagged transaction infra-induced or genuine fraud?" |

### 1. Outage detector
`OutageDetector.fit(metrics_df)` fits one baseline + IsolationForest **per
component**. `score_dataframe(df)` returns only flagged rows
(`component_id, timestamp, confidence, explanation`). A row is flagged only if it
**both** breaks a z-score threshold (default 2.5) on ≥1 feature against that
component's own baseline **and** is flagged by the IsolationForest. The
`explanation` names the top 1–2 deviating features.

### 2. Outage predictor
Rolling-window feature engineering (mean/std/linear-slope over the preceding
`window_s`=30s per feature → 15 features). Windows in
`[start_time - lead_window_s, start_time)` are labelled pre-failure; negatives are
subsampled to balance. **Train/test split is by incident**, so no incident's
pre-failure windows leak across the split. `predict(...)` returns
`failure_probability` + top-2 features by `feature_importances_`; `evaluate(...)`
reports precision/recall/F1 on held-out windows plus **average lead time** before
actual failure for correctly predicted incidents (threshold default 0.7).

### 3. Fraud detector
Causal per-transaction features (only past data): `amount`, account-history
`amount_z`, `seconds_since_last`, `dest_is_new`. `predict(txn)` →
`fraud_probability` + top contributing features. `FraudDetector.evaluate(...)` is a
standalone time-ordered held-out P/R/F1 report.

### 4. Infra-correlation rule engine
`correlate_transaction(txn, incidents, topology, component_id=...)` returns
`infra_induced` (with the correlated `incident_id`) or `uncorrelated`. A flagged
transaction is infra-induced if its timestamp is inside an active or
recently-active (within `propagation_delay_s`=15s after end) incident on its
component **or any component it `depends_on`** in `topology.json`. This re-labels
fraud outputs so infra-caused anomalies (e.g. retry-storm duplicate charges)
aren't mistaken for fraud.

## Note on the CSV schema
Modules are built against the schema in the task spec (`metrics.csv`,
`incidents.csv` with `incident_id/component_id/start_time/end_time/fault_type`,
`transactions.csv`, and `topology.json` nodes with `depends_on`). The repo's real
`data/` files differ slightly (e.g. `infra_metrics.csv`, `incidents.json`, an
edge-list topology). `infra_correlation.load_topology` already handles the
edge-list form; adapt column names in a thin loader if wiring to the real files.
