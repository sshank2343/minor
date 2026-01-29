from locust import HttpUser, task, between, events, LoadTestShape
import os
import time
import json
import sys
from lib.redis_client import publish_metric

# Progressive load testing configuration
PROGRESSIVE_MODE = os.getenv("PROGRESSIVE_MODE", "false").lower() == "true"
AUTO_RAMP_MODE = os.getenv("AUTO_RAMP_MODE", "false").lower() == "true"
MAX_ERROR_RATE = float(os.getenv("MAX_ERROR_RATE", "0.1"))  # 10% default
MAX_LATENCY_MS = int(os.getenv("MAX_LATENCY_MS", "5000"))  # 5 seconds default
FAILURE_WINDOW = int(os.getenv("FAILURE_WINDOW", "30"))  # 30 seconds window

# Auto-ramp configuration - Custom ramping sequence
STEP_DURATION = int(os.getenv("STEP_DURATION", "15"))  # 15 seconds per step (faster)
MAX_USERS = int(os.getenv("MAX_USERS", "1000"))  # Safety limit

# Custom ramping sequence: 1→2→3→4→5→10→25→50→100→200→300→400→500→1000→2000→3000→4000→5000...
RAMPING_SEQUENCE = [1, 2, 3, 4, 5, 10, 25, 50, 100, 200, 300, 400, 500, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000]

# Failure tracking with RPS
failure_tracker = {
    "total_requests": 0,
    "failed_requests": 0,
    "slow_requests": 0,
    "recent_errors": [],
    "test_stopped": False,
    "breaking_point": None,
    "start_time": time.time(),
    "current_users": 0,
    "last_rps_check": time.time(),
    "requests_last_second": 0,
    "current_rps": 0,
    "peak_rps": 0
}

class AutoRampLoadShape(LoadTestShape):
    """
    Automatically ramp up users using custom sequence: 1→5→10→25→50→100→200→300→400→500→1000→2000
    Increases users gradually in aggressive steps for faster capacity discovery.
    """
    
    def tick(self):
        run_time = self.get_run_time()
        
        # Stop if breaking point reached
        if failure_tracker["test_stopped"]:
            return None
        
        # Calculate which step we're on
        step_number = int(run_time // STEP_DURATION)
        
        # Get current users from sequence
        if step_number >= len(RAMPING_SEQUENCE):
            # Reached end of sequence
            current_users = RAMPING_SEQUENCE[-1]
            print(f"\nReached maximum ramping sequence: {current_users} users")
            stop_test(f"Reached end of ramping sequence at {current_users} users")
            return None
        
        current_users = RAMPING_SEQUENCE[step_number]
        
        # Safety limit check
        if current_users > MAX_USERS:
            print(f"\nReached maximum user limit: {MAX_USERS}")
            stop_test(f"Reached safety limit of {MAX_USERS} users")
            return None
        
        # Update current user count for tracking
        failure_tracker["current_users"] = current_users
        
        # Calculate spawn rate based on jump size
        if step_number > 0:
            previous_users = RAMPING_SEQUENCE[step_number - 1]
            spawn_rate = max(current_users - previous_users, 1)
        else:
            spawn_rate = current_users
        
        return (current_users, spawn_rate)

class ScaleSimUser(HttpUser):
    wait_time = between(0.1, 0.5)  # Faster for higher RPS
    
    host = os.getenv("TARGET_URL", "http://target-server:3000")

    def on_start(self):
        self.start_time = time.time()

    @task
    def hit_target(self):
        # Stop if breaking point reached
        if failure_tracker["test_stopped"]:
            return
            
        start = time.time()
        
        # Optional authentication headers
        headers = {}
        api_key = os.getenv("API_KEY")
        bearer_token = os.getenv("BEARER_TOKEN")
        
        if api_key:
            headers["X-API-Key"] = api_key
        if bearer_token:
            headers["Authorization"] = f"Bearer {bearer_token}"

        try:
            with self.client.get("/", headers=headers, catch_response=True, timeout=10) as response:
                latency = int((time.time() - start) * 1000)
                
                # Track request
                failure_tracker["total_requests"] += 1
                failure_tracker["requests_last_second"] += 1
                
                # Calculate RPS every second
                now = time.time()
                if now - failure_tracker["last_rps_check"] >= 1.0:
                    failure_tracker["current_rps"] = failure_tracker["requests_last_second"]
                    if failure_tracker["current_rps"] > failure_tracker["peak_rps"]:
                        failure_tracker["peak_rps"] = failure_tracker["current_rps"]
                    failure_tracker["requests_last_second"] = 0
                    failure_tracker["last_rps_check"] = now
                
                # Check if slow
                if latency > MAX_LATENCY_MS:
                    failure_tracker["slow_requests"] += 1
                
                # Check if error
                is_error = response.status_code >= 400
                if is_error:
                    failure_tracker["failed_requests"] += 1
                    failure_tracker["recent_errors"].append({
                        "timestamp": time.time(),
                        "status": response.status_code,
                        "latency": latency
                    })

                # Calculate elapsed time and RPS
                elapsed_time = time.time() - failure_tracker["start_time"]
                avg_rps = failure_tracker["total_requests"] / max(elapsed_time, 1)

                metric = {
                    "latency_ms": latency,
                    "status_code": response.status_code,
                    "timestamp": time.time(),
                    "total_requests": failure_tracker["total_requests"],
                    "failed_requests": failure_tracker["failed_requests"],
                    "error_rate": failure_tracker["failed_requests"] / max(failure_tracker["total_requests"], 1),
                    "test_stopped": failure_tracker["test_stopped"],
                    "current_users": failure_tracker["current_users"],
                    "current_rps": failure_tracker["current_rps"],
                    "peak_rps": failure_tracker["peak_rps"],
                    "avg_rps": avg_rps
                }

                try:
                    publish_metric(metric)
                except Exception as e:
                    print(f"Failed to publish metric to Redis: {e}")
                
                # Check failure conditions in progressive/auto-ramp mode
                if (PROGRESSIVE_MODE or AUTO_RAMP_MODE) and not failure_tracker["test_stopped"]:
                    check_failure_conditions()

                if is_error:
                    response.failure(f"Error: {response.status_code}")
                else:
                    response.success()
                    
        except Exception as e:
            failure_tracker["failed_requests"] += 1
            failure_tracker["total_requests"] += 1
            print(f"Request exception: {e}")
            
            elapsed_time = time.time() - failure_tracker["start_time"]
            avg_rps = failure_tracker["total_requests"] / max(elapsed_time, 1)
            
            metric = {
                "latency_ms": -1,
                "status_code": 0,
                "timestamp": time.time(),
                "total_requests": failure_tracker["total_requests"],
                "failed_requests": failure_tracker["failed_requests"],
                "error_rate": failure_tracker["failed_requests"] / max(failure_tracker["total_requests"], 1),
                "test_stopped": failure_tracker["test_stopped"],
                "current_users": failure_tracker["current_users"],
                "current_rps": failure_tracker["current_rps"],
                "peak_rps": failure_tracker["peak_rps"],
                "avg_rps": avg_rps,
                "error": str(e)
            }
            
            try:
                publish_metric(metric)
            except:
                pass
                
            if (PROGRESSIVE_MODE or AUTO_RAMP_MODE) and not failure_tracker["test_stopped"]:
                check_failure_conditions()


def check_failure_conditions():
    """Check if API has reached breaking point"""
    if failure_tracker["total_requests"] < 10:  # Need minimum data
        return
    
    error_rate = failure_tracker["failed_requests"] / failure_tracker["total_requests"]
    
    # Check error rate threshold
    if error_rate > MAX_ERROR_RATE:
        stop_test(f"Error rate exceeded: {error_rate:.2%} > {MAX_ERROR_RATE:.2%}")
        return
    
    # Check recent error spike
    now = time.time()
    recent_errors = [e for e in failure_tracker["recent_errors"] 
                     if now - e["timestamp"] < FAILURE_WINDOW]
    
    if len(recent_errors) >= 10:  # 10+ errors in window
        stop_test(f"Error spike detected: {len(recent_errors)} errors in {FAILURE_WINDOW}s")
        return


def stop_test(reason):
    """Stop test and record breaking point"""
    failure_tracker["test_stopped"] = True
    elapsed_time = time.time() - failure_tracker["start_time"]
    avg_rps = failure_tracker["total_requests"] / max(elapsed_time, 1)
    
    failure_tracker["breaking_point"] = {
        "reason": reason,
        "total_requests": failure_tracker["total_requests"],
        "failed_requests": failure_tracker["failed_requests"],
        "error_rate": failure_tracker["failed_requests"] / failure_tracker["total_requests"],
        "timestamp": time.time(),
        "users_at_failure": failure_tracker["current_users"],
        "current_rps": failure_tracker["current_rps"],
        "peak_rps": failure_tracker["peak_rps"],
        "avg_rps": avg_rps,
        "elapsed_time": elapsed_time
    }
    
    # Publish breaking point
    try:
        publish_metric({
            "type": "BREAKING_POINT",
            "breaking_point": failure_tracker["breaking_point"],
            "timestamp": time.time()
        })
    except Exception as e:
        print(f"Failed to publish breaking point: {e}")
    
    print(f"\n{'='*70}")
    print(f"🚨 BREAKING POINT REACHED - API CAPACITY DISCOVERED")
    print(f"{'='*70}")
    print(f"Reason: {reason}")
    print(f"Maximum Concurrent Users: {failure_tracker['current_users']}")
    print(f"Maximum Requests/Second: {failure_tracker['peak_rps']} RPS (peak)")
    print(f"Average Requests/Second: {avg_rps:.2f} RPS")
    print(f"Total Requests Processed: {failure_tracker['total_requests']}")
    print(f"Failed Requests: {failure_tracker['failed_requests']}")
    print(f"Error Rate at Failure: {failure_tracker['breaking_point']['error_rate']:.2%}")
    print(f"Test Duration: {elapsed_time:.1f} seconds")
    print(f"{'='*70}\n")
    
    # Exit Locust gracefully
    sys.exit(0)
