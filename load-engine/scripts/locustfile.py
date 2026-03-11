from locust import HttpUser, task, between, events, LoadTestShape
import os
import time
import json
import sys
from lib.redis_client import publish_metric
from collections import defaultdict

# Dynamic endpoint configuration
TARGET_BASE_URL = os.getenv("TARGET_BASE_URL", "http://target-server:5000")
ENDPOINT_PATH = os.getenv("ENDPOINT_PATH", "/")
METHOD = os.getenv("METHOD", "GET").upper()
HEADERS_JSON = os.getenv("HEADERS", "{}")
BODY_JSON = os.getenv("BODY", None)

# Parse headers and body
try:
    CUSTOM_HEADERS = json.loads(HEADERS_JSON)
except:
    CUSTOM_HEADERS = {}

REQUEST_BODY = None
if BODY_JSON:
    try:
        REQUEST_BODY = json.loads(BODY_JSON)
    except:
        REQUEST_BODY = None

# Breaking point ramp configuration
AUTO_DISCOVERY_MODE = os.getenv("AUTO_DISCOVERY_MODE", "false").lower() == "true"
START_USERS = int(os.getenv("START_USERS", "20"))
STEP_USERS = int(os.getenv("STEP_USERS", "20"))
STEP_DURATION = int(os.getenv("STEP_DURATION", "15"))  # seconds per step
MAX_USERS = int(os.getenv("MAX_USERS", "1000"))

# Stop conditions
MAX_ERROR_RATE = float(os.getenv("MAX_ERROR_RATE", "0.05"))  # 5%
MAX_P95_LATENCY_MS = int(os.getenv("MAX_P95_LATENCY_MS", "2000"))  # 2 seconds
MAX_TIMEOUT_RATE = float(os.getenv("MAX_TIMEOUT_RATE", "0.03"))  # 3%


# Generate intelligent ramping sequence for auto-discovery
def generate_intelligent_ramping_sequence(max_users):
    """
    Generate intelligent ramping sequence: 1 → 2 → 3 → 4 → 5 → 10 → 20 → 30 → 40 → 50 → 100 → 200 → ...
    This allows quick discovery of breaking points while maintaining precision at lower levels.
    """
    sequence = []
    
    # Phase 1: Linear 1-5 (quick initial test)
    sequence.extend([1, 2, 3, 4, 5])
    
    # Phase 2: Increments of 10 from 10-50
    for i in range(10, 60, 10):
        sequence.append(i)
    
    # Phase 3: Increments of 50 from 100-500
    for i in range(100, 550, 50):
        sequence.append(i)
    
    # Phase 4: Increments of 100 from 600-1000
    for i in range(600, 1100, 100):
        sequence.append(i)
    
    # Phase 5: Increments of 250 from 1250-2500
    for i in range(1250, 2750, 250):
        sequence.append(i)
    
    # Phase 6: Increments of 500 from 3000-5000
    for i in range(3000, 5500, 500):
        sequence.append(i)
    
    # Phase 7: Increments of 1000 from 6000 onwards
    current = 6000
    while current <= max_users:
        sequence.append(current)
        current += 1000
    
    # Filter to only include values up to max_users
    return [u for u in sequence if u <= max_users]


# Generate ramping sequence
def generate_ramping_sequence(start, step, max_users):
    """Generate ramping sequence from start by step increments up to max_users"""
    sequence = []
    current = start
    while current <= max_users:
        sequence.append(current)
        current += step
    return sequence

if AUTO_DISCOVERY_MODE:
    RAMPING_SEQUENCE = generate_intelligent_ramping_sequence(MAX_USERS)
    print(f"\n{'='*70}")
    print(f"🤖 AUTO DISCOVERY MODE - Intelligent Ramping")
    print(f"{'='*70}")
    print(f"Target: {TARGET_BASE_URL}{ENDPOINT_PATH}")
    print(f"Method: {METHOD}")
    print(f"Ramping Sequence: {' → '.join(map(str, RAMPING_SEQUENCE[:15]))}{'...' if len(RAMPING_SEQUENCE) > 15 else ''}")
    print(f"Max Users: {MAX_USERS} (safety limit)")
    print(f"Step Duration: {STEP_DURATION}s per step")
    print(f"Stop Conditions:")
    print(f"  - Error Rate: {MAX_ERROR_RATE:.1%}")
    print(f"  - P95 Latency: {MAX_P95_LATENCY_MS}ms")
    print(f"  - Timeout Rate: {MAX_TIMEOUT_RATE:.1%}")
    print(f"{'='*70}\n")
else:
    RAMPING_SEQUENCE = generate_ramping_sequence(START_USERS, STEP_USERS, MAX_USERS)

print(f"\n{'='*70}")
print(f"🎯 BREAKING POINT FINDER - Single Endpoint Mode")
print(f"{'='*70}")
print(f"Target: {TARGET_BASE_URL}{ENDPOINT_PATH}")
print(f"Method: {METHOD}")
print(f"Ramping: {START_USERS} → {MAX_USERS} users (step: {STEP_USERS}, duration: {STEP_DURATION}s)")
print(f"Stop Conditions:")
print(f"  - Error Rate: {MAX_ERROR_RATE:.1%}")
print(f"  - P95 Latency: {MAX_P95_LATENCY_MS}ms")
print(f"  - Timeout Rate: {MAX_TIMEOUT_RATE:.1%}")
print(f"{'='*70}\n")

# Metrics tracking
metrics_tracker = {
    "total_requests": 0,
    "failed_requests": 0,
    "timeout_requests": 0,
    "test_stopped": False,
    "breaking_point": None,
    "start_time": time.time(),
    "current_users": 0,
    "current_stage": 0,
    "last_metrics_publish": time.time(),
    "requests_last_second": 0,
    "current_rps": 0,
    "peak_rps": 0,
    "latencies": [],
    "status_codes": defaultdict(int),
}


class BreakingPointRampShape(LoadTestShape):
    """
    Ramp up users from START_USERS by STEP_USERS every STEP_DURATION seconds.
    Stops when breaking point is detected or MAX_USERS reached.
    """
    
    def tick(self):
        run_time = self.get_run_time()
        
        # Stop if breaking point reached
        if metrics_tracker["test_stopped"]:
            return None
        
        # Calculate which step we're on
        step_number = int(run_time // STEP_DURATION)
        
        # Get current users from sequence
        if step_number >= len(RAMPING_SEQUENCE):
            # Reached end of sequence (MAX_USERS reached)
            current_users = RAMPING_SEQUENCE[-1]
            print(f"\n✅ Reached maximum user limit: {current_users} users (no breaking point detected)")
            stop_test(f"Reached maximum users ({current_users}) without breaking point")
            return None
        
        current_users = RAMPING_SEQUENCE[step_number]
        
        # Update current user count for tracking
        metrics_tracker["current_users"] = current_users
        metrics_tracker["current_stage"] = step_number
        
        # Spawn rate = step size
        spawn_rate = STEP_USERS
        
        return (current_users, spawn_rate)

class ScaleSimUser(HttpUser):
    wait_time = between(0.1, 0.5)
    
    host = TARGET_BASE_URL

    def on_start(self):
        self.start_time = time.time()

    @task
    def hit_target_endpoint(self):
        # Stop if breaking point reached
        if metrics_tracker["test_stopped"]:
            self.environment.runner.quit()
            return
            
        start = time.time()
        
        # Prepare headers
        headers = CUSTOM_HEADERS.copy()
        if METHOD in ["POST", "PUT", "PATCH"] and REQUEST_BODY:
            headers["Content-Type"] = "application/json"

        try:
            # Execute request based on method
            request_kwargs = {
                "headers": headers,
                "catch_response": True,
                "timeout": 30
            }
            
            if METHOD == "GET":
                response = self.client.get(ENDPOINT_PATH, **request_kwargs)
            elif METHOD == "POST":
                request_kwargs["json"] = REQUEST_BODY
                response = self.client.post(ENDPOINT_PATH, **request_kwargs)
            elif METHOD == "PUT":
                request_kwargs["json"] = REQUEST_BODY
                response = self.client.put(ENDPOINT_PATH, **request_kwargs)
            elif METHOD == "DELETE":
                response = self.client.delete(ENDPOINT_PATH, **request_kwargs)
            elif METHOD == "PATCH":
                request_kwargs["json"] = REQUEST_BODY
                response = self.client.patch(ENDPOINT_PATH, **request_kwargs)
            else:
                return
            
            with response:
                latency_ms = int((time.time() - start) * 1000)
                
                # Track metrics
                metrics_tracker["total_requests"] += 1
                metrics_tracker["requests_last_second"] += 1
                metrics_tracker["latencies"].append(latency_ms)
                metrics_tracker["status_codes"][response.status_code] += 1
                
                # Track failures and timeouts
                is_error = response.status_code >= 400
                is_timeout = latency_ms >= 30000  # 30 second timeout
                
                if is_error:
                    metrics_tracker["failed_requests"] += 1
                    response.failure(f"Error: {response.status_code}")
                else:
                    response.success()
                    
                if is_timeout:
                    metrics_tracker["timeout_requests"] += 1
            
            # Publish metrics and check breaking point AFTER response context closes
            publish_metrics_if_needed()
            check_breaking_point_conditions()
                    
        except Exception as e:
            metrics_tracker["failed_requests"] += 1
            metrics_tracker["total_requests"] += 1
            metrics_tracker["timeout_requests"] += 1
            
            publish_metrics_if_needed()
            check_breaking_point_conditions()


def publish_metrics_if_needed():
    """Publish aggregated metrics every second"""
    now = time.time()
    
    # Publish every 1 second
    if now - metrics_tracker["last_metrics_publish"] >= 1.0:
        # Calculate RPS
        metrics_tracker["current_rps"] = metrics_tracker["requests_last_second"]
        if metrics_tracker["current_rps"] > metrics_tracker["peak_rps"]:
            metrics_tracker["peak_rps"] = metrics_tracker["current_rps"]
        
        # Calculate latency percentiles
        latencies = sorted(metrics_tracker["latencies"][-1000:])  # Last 1000 requests
        n = len(latencies)
        
        if n > 0:
            p50_latency = latencies[int(n * 0.50)] if n > 0 else 0
            p95_latency = latencies[int(n * 0.95)] if n > 1 else latencies[0]
            p99_latency = latencies[int(n * 0.99)] if n > 2 else latencies[-1]
            avg_latency = sum(latencies) / n
        else:
            p50_latency = p95_latency = p99_latency = avg_latency = 0
        
        # Calculate rates
        error_rate = metrics_tracker["failed_requests"] / max(metrics_tracker["total_requests"], 1)
        timeout_rate = metrics_tracker["timeout_requests"] / max(metrics_tracker["total_requests"], 1)
        
        elapsed_time = time.time() - metrics_tracker["start_time"]
        avg_rps = metrics_tracker["total_requests"] / max(elapsed_time, 1)
        
        # Build metric payload
        metric = {
            "timestamp": now,
            "users": metrics_tracker["current_users"],
            "ramp_stage": metrics_tracker["current_stage"],
            "rps": metrics_tracker["current_rps"],
            "avg_latency": int(avg_latency),
            "p50_latency": p50_latency,
            "p95_latency": p95_latency,
            "p99_latency": p99_latency,
            "error_rate": error_rate,
            "timeout_rate": timeout_rate,
            "status_codes": dict(metrics_tracker["status_codes"]),
            "total_requests": metrics_tracker["total_requests"],
            "failed_requests": metrics_tracker["failed_requests"],
        }
        
        print(f"📊 Publishing: Users={metric['users']}, RPS={metric['rps']}, P95={metric['p95_latency']}ms")
        
        try:
            publish_metric(metric)
        except Exception as e:
            print(f"Failed to publish metric to Redis: {e}")
        
        # Reset per-second counters
        metrics_tracker["requests_last_second"] = 0
        metrics_tracker["last_metrics_publish"] = now


def check_breaking_point_conditions():
    """Check if API has reached breaking point based on stop conditions"""
    # Need minimum data before checking (at least 50 requests)
    if metrics_tracker["total_requests"] < 50:
        return
    
    # Calculate current metrics
    error_rate = metrics_tracker["failed_requests"] / metrics_tracker["total_requests"]
    timeout_rate = metrics_tracker["timeout_requests"] / metrics_tracker["total_requests"]
    
    # Get recent latencies for P95 calculation
    latencies = sorted(metrics_tracker["latencies"][-1000:])
    n = len(latencies)
    p95_latency = latencies[int(n * 0.95)] if n > 1 else 0
    
    # Check stop conditions
    if error_rate > MAX_ERROR_RATE:
        stop_test(f"Error rate exceeded: {error_rate:.2%} > {MAX_ERROR_RATE:.2%}")
        return
    
    if timeout_rate > MAX_TIMEOUT_RATE:
        stop_test(f"Timeout rate exceeded: {timeout_rate:.2%} > {MAX_TIMEOUT_RATE:.2%}")
        return
    
    if p95_latency > MAX_P95_LATENCY_MS:
        stop_test(f"P95 latency exceeded: {p95_latency}ms > {MAX_P95_LATENCY_MS}ms")
        return


def stop_test(reason):
    """Stop test and record breaking point"""
    if metrics_tracker["test_stopped"]:
        return
        
    metrics_tracker["test_stopped"] = True
    elapsed_time = time.time() - metrics_tracker["start_time"]
    avg_rps = metrics_tracker["total_requests"] / max(elapsed_time, 1)
    
    # Calculate final latency percentiles
    latencies = sorted(metrics_tracker["latencies"])
    n = len(latencies)
    
    if n > 0:
        p50_latency = latencies[int(n * 0.50)] if n > 0 else 0
        p95_latency = latencies[int(n * 0.95)] if n > 1 else latencies[0]
        p99_latency = latencies[int(n * 0.99)] if n > 2 else latencies[-1]
    else:
        p50_latency = p95_latency = p99_latency = 0
    
    error_rate = metrics_tracker["failed_requests"] / max(metrics_tracker["total_requests"], 1)
    timeout_rate = metrics_tracker["timeout_requests"] / max(metrics_tracker["total_requests"], 1)
    
    metrics_tracker["breaking_point"] = {
        "reason": reason,
        "total_requests": metrics_tracker["total_requests"],
        "failed_requests": metrics_tracker["failed_requests"],
        "error_rate": error_rate,
        "timeout_rate": timeout_rate,
        "timestamp": time.time(),
        "users_at_failure": metrics_tracker["current_users"],
        "current_rps": metrics_tracker["current_rps"],
        "peak_rps": metrics_tracker["peak_rps"],
        "avg_rps": avg_rps,
        "elapsed_time": elapsed_time,
        "p50_latency": p50_latency,
        "p95_latency": p95_latency,
        "p99_latency": p99_latency,
    }
    
    # Publish breaking point
    try:
        publish_metric({
            "type": "BREAKING_POINT",
            "breaking_point": metrics_tracker["breaking_point"],
            "timestamp": time.time()
        })
    except Exception as e:
        print(f"Failed to publish breaking point: {e}")
    
    print(f"\n{'='*70}")
    print(f"🚨 BREAKING POINT REACHED")
    print(f"{'='*70}")
    print(f"Endpoint: {METHOD} {ENDPOINT_PATH}")
    print(f"Reason: {reason}")
    print(f"Breaking Point Users: {metrics_tracker['current_users']}")
    print(f"Peak RPS: {metrics_tracker['peak_rps']} req/s")
    print(f"Average RPS: {avg_rps:.2f} req/s")
    print(f"Total Requests: {metrics_tracker['total_requests']}")
    print(f"Failed Requests: {metrics_tracker['failed_requests']}")
    print(f"Error Rate: {error_rate:.2%}")
    print(f"Timeout Rate: {timeout_rate:.2%}")
    print(f"P50 Latency: {p50_latency}ms")
    print(f"P95 Latency: {p95_latency}ms")
    print(f"P99 Latency: {p99_latency}ms")
    print(f"Test Duration: {elapsed_time:.1f} seconds")
    print(f"{'='*70}\n")
    
    # Exit Locust gracefully
    sys.exit(0)
