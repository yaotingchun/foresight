from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
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

class ChatPayload(BaseModel):
    messages: list
    system_context: dict

@app.post("/api/chat")
async def chat_with_ai(payload: ChatPayload):
    from server.services.chat_ai import chat_with_system_context
    try:
        reply = chat_with_system_context(payload.messages, payload.system_context)
        return {"reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

@app.websocket("/api/stream")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "TX_INGEST":
                try:
                    tx_data = data.get("data")
                    result = ml_service.predict_fraud(tx_data)
                    # Broadcast the processed result
                    await manager.broadcast({"type": "TX_PROCESSED", "data": result, "original": tx_data})
                except Exception as e:
                    print(f"Error processing transaction: {e}")
            elif data.get("type") == "METRICS_INGEST":
                try:
                    metrics_data = data.get("data")
                    result = ml_service.predict_outage(metrics_data)
                    if result is not None:
                        result["anomalous"] = True
                    else:
                        result = {"anomalous": False, "component_id": metrics_data.get("component_id")}
                    await manager.broadcast({"type": "METRICS_PROCESSED", "data": result, "original": metrics_data})
                except Exception as e:
                    print(f"Error processing metrics: {e}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        
if __name__ == "__main__":
    import uvicorn
    # Run from root dir: python -m server.main
    uvicorn.run("server.main:app", host="0.0.0.0", port=8000, reload=True)
