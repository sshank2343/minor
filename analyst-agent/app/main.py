from fastapi import FastAPI, Body
import threading
import requests
from app.collectors.log_watcher import start_log_watcher
from app.agents.report_generator import generate_report_from_breaking_point

app = FastAPI(title="ScaleSim Analyst Agent")

@app.on_event("startup")
async def startup_event():
    # Run log watcher in background thread to avoid blocking FastAPI
    watcher_thread = threading.Thread(target=start_log_watcher, daemon=True)
    watcher_thread.start()
    print("Analyst agent started, log watcher running in background")

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "analyst-agent"}

@app.post("/analyze/{test_id}")
async def trigger_analysis(test_id: str, breaking_point: dict = Body(default=None)):
    """
    Trigger AI root cause analysis for a specific test.
    
    This endpoint is called by the control-plane when a breaking point is detected.
    It fetches test data, analyzes the failure, and sends back a structured RCA report.
    """
    try:
        # Fetch test data from control-plane
        try:
            response = requests.get(
                f"http://control-plane:5000/api/test/{test_id}",
                timeout=5
            )
            
            if response.status_code != 200:
                return {"status": "error", "message": "Failed to fetch test data"}
            
            test_data = response.json()
            test_run = test_data.get("testRun", {})
            
        except requests.RequestException as e:
            print(f"Failed to fetch test data: {e}")
            return {"status": "error", "message": "Failed to fetch test data"}
        
        # Generate report in background
        threading.Thread(
            target=generate_report_from_breaking_point,
            args=(test_id, test_run, breaking_point or {}),
            daemon=True
        ).start()
        
        return {"status": "Analysis triggered", "test_id": test_id}
    except Exception as e:
        return {"status": "error", "message": str(e)}

