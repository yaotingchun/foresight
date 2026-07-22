from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from contextlib import asynccontextmanager

from server.services.ml_service import ml_service

# Define lifespan to initialize models on startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Path to the data directory
    data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
    ml_service.initialize(data_dir)
    yield
    # Cleanup if needed
    print("Shutting down ML Service...")

app = FastAPI(title="Foresight Backend API", lifespan=lifespan)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TransactionPayload(BaseModel):
    transaction_id: str
    account_id: str
    amount: float
    source_account: str
    dest_account: str
    timestamp: str
    component_id: str = "payment-service"

class MetricsPayload(BaseModel):
    component_id: str
    timestamp: str
    cpu_pct: float
    memory_pct: float
    latency_ms: float
    error_rate: float
    log_error_rate_per_min: float

@app.get("/api/status")
async def get_status():
    return {"status": "ok", "ml_initialized": ml_service.is_initialized}

@app.post("/api/predict/fraud")
async def predict_fraud(transaction: TransactionPayload):
    try:
        result = ml_service.predict_fraud(transaction.model_dump())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/predict/outage")
async def predict_outage(metrics: MetricsPayload):
    try:
        result = ml_service.predict_outage(metrics.model_dump())
        # score_row returns None if not anomalous
        if result is None:
            return {"anomalous": False, "component_id": metrics.component_id}
        result["anomalous"] = True
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze-incident")
async def analyze_incident(incident: dict):
    from server.services.remediation_ai import analyze_incident_with_ai
    try:
        topology = ml_service.topology or {}
        result = analyze_incident_with_ai(incident, topology)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Run from root dir: python -m server.main
    uvicorn.run("server.main:app", host="0.0.0.0", port=8000, reload=True)
