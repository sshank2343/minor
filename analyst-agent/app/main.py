from fastapi import FastAPI
from app.collectors.log_watcher import start_log_watcher

app = FastAPI(title="ScaleSim Analyst Agent")

@app.on_event("startup")
async def startup_event():
    start_log_watcher()

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "analyst-agent"}
