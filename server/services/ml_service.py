import sys
import os
import pandas as pd
import json

# Add project root to sys.path so we can import from ml module
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.fraud_detector import FraudDetector
from ml.outage_detector import OutageDetector
from ml.infra_correlation import load_topology, correlate_transaction

class MLService:
    def __init__(self):
        self.fraud_detector = FraudDetector()
        self.outage_detector = OutageDetector()
        self.topology = None
        self.incidents_df = None
        self.depends_map = None
        self.is_initialized = False

    def initialize(self, data_dir: str):
        print(f"Initializing ML models from {data_dir}...")
        
        # Load and fit Fraud Detector
        transactions_path = os.path.join(data_dir, "transactions.csv")
        if os.path.exists(transactions_path):
            txns = pd.read_csv(transactions_path)
            # Map schema to match what FraudDetector expects
            txns = txns.rename(columns={
                "id": "transaction_id",
                "src": "account_id",
                "dst": "dest_account",
                "is_fraud": "is_fraud_label"
            })
            if "source_account" not in txns.columns:
                txns["source_account"] = txns["account_id"]
            self.fraud_detector.fit(txns)
            print(f"FraudDetector initialized with {len(txns)} transactions.")
        else:
            print("Warning: transactions.csv not found.")

        # Load and fit Outage Detector
        metrics_path = os.path.join(data_dir, "infra_metrics.csv")
        if os.path.exists(metrics_path):
            metrics = pd.read_csv(metrics_path, parse_dates=["timestamp"])
            # Map schema to match what OutageDetector expects
            metrics = metrics.rename(columns={
                "error_rate_pct": "error_rate"
            })
            if "log_error_rate_per_min" not in metrics.columns:
                metrics["log_error_rate_per_min"] = 0.0 # Fill missing expected feature
            self.outage_detector.fit(metrics)
            print(f"OutageDetector initialized with {len(metrics)} metric records.")
        else:
            print("Warning: infra_metrics.csv not found.")

        # Load topology
        topology_path = os.path.join(data_dir, "topology.json")
        if os.path.exists(topology_path):
            self.depends_map = load_topology(topology_path)
            with open(topology_path) as f:
                self.topology = json.load(f)
            print("Topology loaded.")
        else:
            print("Warning: topology.json not found.")

        # Load incidents
        incidents_path = os.path.join(data_dir, "incidents.json")
        if os.path.exists(incidents_path):
            with open(incidents_path) as f:
                inc_data = json.load(f)
            self.incidents_df = pd.DataFrame(inc_data)
            print(f"Loaded {len(self.incidents_df)} incidents.")
        else:
            print("Warning: incidents.json not found.")
            
        self.is_initialized = True
        print("ML Service initialization complete.")

    def predict_fraud(self, transaction: dict):
        if not self.is_initialized:
            raise RuntimeError("MLService is not initialized")
            
        result = self.fraud_detector.predict(transaction)
        
        # Correlate with infra if possible
        if self.incidents_df is not None and self.topology is not None:
            comp = transaction.get("component_id", "payment-service")
            corr = correlate_transaction(
                transaction, 
                self.incidents_df, 
                self.topology, 
                component_id=comp,
                depends_map=self.depends_map
            )
            result["correlation"] = corr
            
        return result
        
    def predict_outage(self, metrics_row: dict):
        if not self.is_initialized:
            raise RuntimeError("MLService is not initialized")
            
        return self.outage_detector.score_row(metrics_row)

# Singleton instance
ml_service = MLService()
