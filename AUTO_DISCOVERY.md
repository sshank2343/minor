# 🤖 Automated API Capacity Discovery

## Overview

ScaleSim's **Auto-Discovery Mode** is a fully automated stress-testing system that discovers the real performance limits of any API endpoint **without requiring you to manually specify the number of users**. 

Just provide:
1. The API endpoint URL
2. Optional failure thresholds (error rate, latency)

The system will:
- Start from **1 user** (or your specified initial count)
- Automatically **ramp up** load in incremental steps
- Track **real-time RPS** (requests per second)
- Detect the **breaking point** automatically
- Provide a comprehensive **capacity summary**

---

## 🚀 Quick Start

### 1. Enable Auto-Discovery Mode

In the ScaleSim dashboard:

1. Check the **"🤖 Auto-Discovery Mode"** checkbox
2. Configure ramping parameters (optional):
   - **Initial Users**: Starting user count (default: 1)
   - **User Increment**: Users added per step (default: 5)
   - **Step Duration**: Seconds between increments (default: 30s)
   - **Max Error Rate**: Stop threshold (default: 10%)
   - **Max Latency**: Consider slow requests as failures (default: 5000ms)
3. Enter your **Target URL**
4. Set a **Max Users** value as a safety limit (e.g., 1000)
5. Click **"🤖 Discover API Capacity"**

### 2. What Happens Next

The system will:

```
Time   Users   RPS    Status
----   -----   ---    ------
0:00   1       2      Ramping up...
0:30   6       12     Ramping up...
1:00   11      22     Ramping up...
1:30   16      32     Ramping up...
2:00   21      41     Ramping up...
2:30   26      48     ⚠️ Error rate spiking...
2:35   26      35     🚨 BREAKING POINT REACHED
```

### 3. View Results

When the breaking point is detected, you'll see:

- **Maximum Concurrent Users**: Highest stable user count
- **Peak RPS**: Maximum requests per second achieved
- **Average RPS**: Average throughput across test
- **Breaking Point Reason**: Why the API failed (error rate, spike, latency)
- **Total Duration**: Time to discover capacity
- **Error Rate at Failure**: Percentage of failed requests

---

## 📊 How It Works

### Automatic Ramping Algorithm

```python
# Pseudocode
users = initial_users  # Start at 1
while not breaking_point_reached:
    run_load_test(users)
    wait(step_duration)  # 30 seconds
    
    if error_rate > threshold or error_spike_detected:
        break  # Breaking point found!
    
    users += user_increment  # Add 5 more users
    
    if users > max_users:
        break  # Safety limit
```

### Breaking Point Detection

The system stops automatically when:

1. **Error Rate Threshold**: Error rate exceeds configured limit (e.g., >10%)
2. **Error Spike**: 10+ errors occur within 30-second window
3. **Latency Degradation**: Response times exceed max latency threshold
4. **Safety Limit**: User count reaches configured maximum

### RPS (Requests Per Second) Tracking

- **Real-time calculation**: Updated every second
- **Peak tracking**: Highest RPS achieved during test
- **Average calculation**: Total requests / total time
- **Breaking point RPS**: Captured at moment of failure

---

## 🎯 Use Cases

### 1. New API Capacity Planning

**Scenario**: You've deployed a new API and need to know its limits.

**Configuration**:
- Initial Users: 1
- User Increment: 10
- Step Duration: 60s
- Max Users: 500
- Max Error Rate: 5%

**Outcome**: Discovers API can handle 230 concurrent users at 450 RPS before errors spike.

---

### 2. Post-Deployment Verification

**Scenario**: After optimizations, verify improvements.

**Configuration**:
- Initial Users: 50 (start higher if you know baseline)
- User Increment: 20
- Step Duration: 30s
- Max Users: 1000
- Max Error Rate: 10%

**Outcome**: Confirms optimization increased capacity from 230 to 480 users (2x improvement).

---

### 3. Third-Party API Testing

**Scenario**: Testing external API with rate limits.

**Configuration**:
- Initial Users: 1
- User Increment: 2 (small increments)
- Step Duration: 45s (allow rate limit windows to reset)
- Max Users: 100
- Max Error Rate: 15%
- Add API Key/Bearer Token in ControlPanel

**Outcome**: Discovers rate limit at ~50 RPS, triggered by HTTP 429 errors.

---

### 4. Infrastructure Comparison

**Scenario**: Compare performance across different server configs.

**Test A** (2 CPU, 4GB RAM):
```
Max Users: 120
Peak RPS: 240
Avg RPS: 210
Breaking Point: Error rate exceeded (12%)
```

**Test B** (4 CPU, 8GB RAM):
```
Max Users: 350
Peak RPS: 680
Avg RPS: 620
Breaking Point: Error rate exceeded (11%)
```

**Result**: 4 CPU setup handles 2.9x more load.

---

## ⚙️ Configuration Guide

### Recommended Settings

| Scenario | Initial Users | Increment | Step Duration | Max Users | Max Error Rate |
|----------|---------------|-----------|---------------|-----------|----------------|
| **Conservative** | 1 | 3 | 45s | 500 | 5% |
| **Balanced** | 5 | 5 | 30s | 1000 | 10% |
| **Aggressive** | 10 | 10 | 20s | 2000 | 15% |

### Parameter Explanations

#### Initial Users
- **Default**: 1
- **Purpose**: Starting point for ramping
- **Tip**: Use higher values if you already know baseline capacity

#### User Increment
- **Default**: 5
- **Purpose**: Users added each step
- **Trade-off**: 
  - Smaller = More precise but slower
  - Larger = Faster but less granular

#### Step Duration
- **Default**: 30 seconds
- **Purpose**: Time at each user level before incrementing
- **Tip**: Longer durations give more stable results, especially for APIs with caching

#### Max Users (Safety Limit)
- **Default**: 1000
- **Purpose**: Prevent runaway tests
- **Tip**: Set based on your infrastructure limits

#### Max Error Rate
- **Default**: 10%
- **Purpose**: Threshold for acceptable failures
- **Tip**: Lower values (5%) for critical APIs, higher (15%) for exploratory tests

#### Max Latency
- **Default**: 5000ms (5 seconds)
- **Purpose**: Define "slow" requests as failures
- **Tip**: Set based on SLA requirements (e.g., 1000ms for real-time APIs)

---

## 📈 Interpreting Results

### Breaking Point Summary

When auto-discovery completes, you'll see:

```
🚨 API CAPACITY DISCOVERED
══════════════════════════════════════════════════════════════════════

Reason: Error rate exceeded: 12.45% > 10.00%
Maximum Concurrent Users: 156
Maximum Requests/Second: 312 RPS (peak)
Average Requests/Second: 285.43 RPS
Total Requests Processed: 45,678
Failed Requests: 5,689
Error Rate at Failure: 12.45%
Test Duration: 160.2 seconds

══════════════════════════════════════════════════════════════════════
```

### Key Metrics Explained

| Metric | Meaning | Use For |
|--------|---------|---------|
| **Max Users** | Highest stable concurrent user count | Capacity planning, autoscaling rules |
| **Peak RPS** | Maximum throughput achieved | Infrastructure sizing, cache tuning |
| **Avg RPS** | Sustained throughput | SLA definitions, cost projections |
| **Breaking Point Reason** | Why API failed | Identifying bottlenecks (DB, CPU, network) |
| **Error Rate** | Percentage of failures | Reliability assessment, alert thresholds |
| **Duration** | Time to discover capacity | Test planning, CI/CD integration |

### Performance Patterns

#### Gradual Degradation
```
Users: 50  → 100 → 150 → 200 → 250
RPS:   100 → 200 → 280 → 300 → 305
Errors: 0% → 1% → 5% → 9% → 12%  ← Breaking point
```
**Interpretation**: API gracefully degrades. CPU/memory bottleneck likely.

#### Sudden Failure
```
Users: 50  → 100 → 150 → 200
RPS:   100 → 200 → 300 → 150
Errors: 0% → 0% → 1% → 45%  ← Breaking point
```
**Interpretation**: Hard limit hit (connection pool, rate limiter, database).

#### Oscillation
```
Users: 50  → 100 → 150 → 200
RPS:   100 → 200 → 180 → 220
Errors: 0% → 2% → 8% → 6%
```
**Interpretation**: Intermittent issue (network, external dependency, GC pauses).

---

## 🔧 API Testing

### Using Auto-Discovery via API

```bash
curl -X POST http://localhost:5000/api/start-test \
  -H "Content-Type: application/json" \
  -d '{
    "targetUrl": "https://api.example.com/endpoint",
    "autoRampMode": true,
    "initialUsers": 1,
    "userIncrement": 5,
    "stepDuration": 30,
    "users": 1000,
    "spawnRate": 10,
    "duration": 600,
    "maxErrorRate": 0.10,
    "maxLatencyMs": 5000,
    "failureWindow": 30,
    "apiKey": "optional-api-key",
    "bearerToken": "optional-bearer-token"
  }'
```

**Response**:
```json
{
  "message": "auto-ramp test created and started",
  "testRun": {
    "_id": "507f1f77bcf86cd799439011",
    "status": "CREATED",
    "targetUrl": "https://api.example.com/endpoint",
    "autoRampMode": true,
    ...
  },
  "mode": "auto-ramp"
}
```

### Retrieve Results

```bash
curl http://localhost:5000/api/test-status/507f1f77bcf86cd799439011
```

**Response**:
```json
{
  "testRun": {
    "_id": "507f1f77bcf86cd799439011",
    "status": "BREAKING_POINT",
    "targetUrl": "https://api.example.com/endpoint",
    "breakingPoint": {
      "reason": "Error rate exceeded: 12.45% > 10.00%",
      "usersAtFailure": 156,
      "peakRps": 312,
      "avgRps": 285.43,
      "totalRequests": 45678,
      "failedRequests": 5689,
      "errorRate": 0.1245,
      "elapsedTime": 160.2
    },
    "maxStableUsers": 156,
    "peakRps": 312,
    "avgRps": 285.43
  }
}
```

---

## 🆚 Mode Comparison

| Feature | Standard Mode | Progressive Mode | Auto-Discovery Mode |
|---------|---------------|------------------|---------------------|
| **Manual user count** | ✅ Required | ✅ Required | ❌ Automatic |
| **Manual duration** | ✅ Required | ✅ Required | ❌ Auto-stop |
| **Auto-stop on failure** | ❌ No | ✅ Yes | ✅ Yes |
| **RPS tracking** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Breaking point detection** | ❌ No | ✅ Yes | ✅ Yes |
| **Incremental ramping** | ❌ No | ❌ No | ✅ Yes |
| **Capacity discovery** | ❌ No | ⚠️ Manual | ✅ Automatic |
| **Best for** | Fixed load tests | Known capacity validation | Unknown API exploration |

---

## ❓ Troubleshooting

### Test Never Reaches Breaking Point

**Symptom**: Test runs to max users without stopping.

**Causes**:
1. **API is very robust**: Increase `users` safety limit
2. **Thresholds too lenient**: Lower `maxErrorRate` to 5%
3. **API cached responses**: Target different endpoints or add cache-busting headers

**Solution**:
```json
{
  "maxErrorRate": 0.05,  // More sensitive
  "maxLatencyMs": 2000,  // Stricter latency
  "users": 5000          // Higher ceiling
}
```

---

### Test Stops Too Early

**Symptom**: Breaking point detected at low user counts.

**Causes**:
1. **Cold start**: API warming up
2. **Thresholds too strict**: Increase tolerance
3. **Network issues**: Check connectivity

**Solution**:
```json
{
  "initialUsers": 10,     // Skip warmup phase
  "maxErrorRate": 0.15,   // More lenient
  "failureWindow": 60     // Longer observation window
}
```

---

### RPS Lower Than Expected

**Symptom**: RPS seems artificially low.

**Causes**:
1. **Wait time too long**: Users pausing between requests
2. **User increment too slow**: Not enough concurrent requests

**Solution**:
- Edit [locustfile.py](load-engine/scripts/locustfile.py) line 73:
  ```python
  wait_time = between(0.05, 0.1)  # Faster requests
  ```
- Increase `userIncrement` to 10 or 20

---

### Inconsistent Results

**Symptom**: Different breaking points on repeated runs.

**Causes**:
1. **External dependencies**: Database, cache, third-party APIs
2. **Step duration too short**: Not enough stabilization time
3. **Network variability**: Cloud environments

**Solution**:
```json
{
  "stepDuration": 60,     // Longer stabilization
  "userIncrement": 3      // Smaller increments
}
```

Run multiple tests and average results.

---

## 🎓 Best Practices

### 1. Start Conservative
- Begin with small increments (3-5 users)
- Use longer step durations (45-60s)
- Set strict error thresholds (5%)

### 2. Understand Your Baseline
- Run standard tests first to estimate capacity
- Use `initialUsers` to skip known-safe ranges

### 3. Test Realistic Scenarios
- Use production-like endpoints
- Add authentication headers
- Mix read/write operations

### 4. Monitor Infrastructure
- Watch CPU, memory, database connections
- Correlate breaking point with infrastructure metrics
- Use ScaleSim alongside APM tools

### 5. Document Results
- Save breaking point summaries
- Track capacity over time
- Share findings with team

### 6. Automate in CI/CD
- Run nightly capacity checks
- Alert on capacity regressions
- Integrate with deployment pipelines

---

## 🔗 Related Documentation

- [Progressive Testing Guide](PROGRESSIVE_TESTING.md) - Manual load testing with auto-stop
- [README.md](README.md) - Full project documentation
- [API Reference](README.md#api-endpoints) - REST API documentation

---

## 🤝 Contributing

Found a bug or have a feature request for auto-discovery mode? 

1. Open an issue on GitHub
2. Submit a pull request
3. Join our Discord community

---

## 📝 Example Workflow

```bash
# 1. Start ScaleSim
docker-compose up -d

# 2. Open dashboard
# http://localhost:8080

# 3. Configure auto-discovery
#    ✅ Enable "Auto-Discovery Mode"
#    Target URL: http://target-server:3000/cpu-heavy
#    Initial Users: 1
#    User Increment: 5
#    Step Duration: 30s
#    Max Users: 500
#    Max Error Rate: 10%

# 4. Click "Discover API Capacity"

# 5. Watch real-time metrics
#    - Users ramping: 1 → 6 → 11 → 16...
#    - RPS climbing: 2 → 12 → 22 → 32...
#    - Latency increasing: 50ms → 100ms → 500ms...
#    - Errors appearing: 0% → 2% → 8% → 12%

# 6. Breaking point reached!
#    🚨 Error rate exceeded: 12.34% > 10.00%
#    Max Users: 126
#    Peak RPS: 252
#    Avg RPS: 230.5

# 7. Analyze results in dashboard summary
```

---

**Happy capacity testing! 🚀**
