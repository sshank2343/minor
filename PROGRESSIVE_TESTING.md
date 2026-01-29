# 🚀 Progressive Load Testing - Complete Guide

## Overview

ScaleSim now supports **Progressive Load Testing** with automatic failure detection and breaking point identification. This feature automatically tests API endpoints to find their exact performance limits.

---

## 🎯 What is Progressive Testing?

Progressive testing gradually increases load on an API endpoint and automatically stops when the API reaches its breaking point. Unlike traditional fixed-load testing, progressive testing:

- ✅ Starts from low load and gradually increases
- ✅ Automatically detects when API fails
- ✅ Stops immediately at breaking point
- ✅ Shows exact capacity limits
- ✅ Identifies failure reasons

---

## 📊 How It Works

### 1. **Gradual Load Increase**
```
Time:  0s ────► 10s ────► 20s ────► 30s ────► STOP
Users: 2 ────► 5  ────► 10 ────► 20 ────► Breaking Point!
```

### 2. **Real-Time Monitoring**
The system tracks:
- **Response Time (Latency)** - How fast API responds
- **Error Rate** - Percentage of failed requests
- **Success Rate** - Percentage of successful requests (2xx)
- **Slow Requests** - Requests exceeding latency threshold

### 3. **Automatic Failure Detection**
Test stops when:
- **Error rate** exceeds threshold (default: 10%)
- **Error spike** occurs (10+ errors in 30 seconds)
- **Sustained failures** detected
- **Latency** consistently exceeds maximum

### 4. **Breaking Point Capture**
When API breaks, the system:
- ❌ Stops the test immediately
- 📊 Freezes the graph at breaking point
- 📝 Records failure reason
- 💾 Saves all metrics
- 📈 Shows max capacity achieved

---

## 🎮 How to Use

### **Method 1: Dashboard (Easiest)**

1. **Open Dashboard**
   ```
   http://localhost:5173
   ```

2. **Enable Progressive Mode**
   - ✅ Check "📈 Progressive Load Testing" checkbox
   - Configure thresholds:
     - **Max Error Rate**: 10% (stop if error rate exceeds this)
     - **Max Latency**: 5000ms (consider slower requests as failures)

3. **Configure Test**
   ```
   Target URL: https://api.example.com/endpoint
   Max Users: 100 (upper limit)
   Spawn Rate: 5 (users added per second)
   Duration: 300 (max test duration)
   ```

4. **Start Test**
   - Click "🚀 Start Progressive Test"
   - Watch real-time metrics
   - Test auto-stops at breaking point

---

### **Method 2: API Call**

```bash
curl -X POST http://localhost:5000/api/start-test \
  -H "Content-Type: application/json" \
  -d '{
    "targetUrl": "https://api.client.com/users",
    "users": 100,
    "spawnRate": 5,
    "duration": 300,
    "progressiveMode": true,
    "maxErrorRate": 0.1,
    "maxLatencyMs": 5000,
    "failureWindow": 30
  }'
```

---

## ⚙️ Configuration Parameters

### **Basic Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `targetUrl` | string | required | API endpoint to test |
| `users` | number | required | Maximum concurrent users |
| `spawnRate` | number | required | Users added per second |
| `duration` | number | required | Max test duration (seconds) |

### **Progressive Mode Parameters**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `progressiveMode` | boolean | `false` | Enable progressive testing |
| `maxErrorRate` | number | `0.1` | Max error rate (0.1 = 10%) |
| `maxLatencyMs` | number | `5000` | Max acceptable latency (ms) |
| `failureWindow` | number | `30` | Error spike detection window (seconds) |

### **Authentication (Optional)**

| Parameter | Type | Description |
|-----------|------|-------------|
| `apiKey` | string | API key for X-API-Key header |
| `bearerToken` | string | Bearer token for Authorization header |

---

## 📈 Understanding Results

### **Dashboard Metrics**

#### **1. Performance Chart**
- **Blue Line**: Response latency over time
- **Red Line**: Error rate percentage
- **Red Dashed Line**: Breaking point marker
- **Shows**: Exact moment API failed

#### **2. Breaking Point Alert**
```
🚨 BREAKING POINT REACHED

Reason: Error rate exceeded: 15.30% > 10.00%
Total Requests: 1,247
Failed Requests: 191
Error Rate: 15.30%
```

#### **3. System Health**
- **🟢 HEALTHY**: API responding normally
- **🟡 DEGRADED**: Performance declining
- **🔴 FAILED**: Breaking point reached

---

### **API Response**

After test completes, query test status:

```bash
GET /api/test/:testId
```

**Response:**
```json
{
  "testRun": {
    "status": "BREAKING_POINT",
    "targetUrl": "https://api.client.com/users",
    "users": 50,
    "progressiveMode": true,
    "breakingPoint": {
      "reason": "Error rate exceeded: 12.50% > 10.00%",
      "totalRequests": 2400,
      "failedRequests": 300,
      "errorRate": 0.125,
      "usersAtFailure": 45,
      "timestamp": "2026-01-29T22:30:45.000Z"
    },
    "maxStableUsers": 40,
    "totalRequests": 2400,
    "failedRequests": 300
  }
}
```

---

## 🔍 Real-World Examples

### **Example 1: E-commerce Checkout API**

**Scenario**: Find maximum users checkout API can handle

```json
{
  "targetUrl": "https://shop.example.com/api/checkout",
  "users": 200,
  "spawnRate": 10,
  "duration": 600,
  "progressiveMode": true,
  "maxErrorRate": 0.05,
  "maxLatencyMs": 3000
}
```

**Result**:
```
✅ Max Stable Users: 85 concurrent users
❌ Breaking Point: 92 users
📊 Failure Reason: Error rate exceeded 5%
🕐 Latency at Failure: 2,845ms average
💡 Recommendation: Scale before 85 concurrent users
```

---

### **Example 2: Search API Performance**

**Scenario**: Test search endpoint under increasing load

```json
{
  "targetUrl": "https://api.example.com/search?q=test",
  "users": 500,
  "spawnRate": 20,
  "duration": 300,
  "progressiveMode": true,
  "maxErrorRate": 0.15,
  "maxLatencyMs": 10000
}
```

**Result**:
```
✅ Max Stable Users: 320 concurrent users
❌ Breaking Point: 365 users
📊 Failure Reason: Error spike detected (15 errors in 30s)
🕐 Latency at Failure: 8,200ms average
💡 Recommendation: Optimize database queries
```

---

### **Example 3: Third-Party API Limits**

**Scenario**: Find rate limits of external API

```json
{
  "targetUrl": "https://api.thirdparty.com/data",
  "users": 100,
  "spawnRate": 5,
  "duration": 120,
  "progressiveMode": true,
  "maxErrorRate": 0.2,
  "apiKey": "sk_test_abc123"
}
```

**Result**:
```
✅ Max Stable Users: 25 concurrent users
❌ Breaking Point: 28 users
📊 Failure Reason: 429 Too Many Requests
🕐 Requests per Second: ~28 RPS
💡 Recommendation: Implement rate limiting at 25 RPS
```

---

## 🎯 Use Cases

### **1. Capacity Planning**
- Find exact number of users your API can handle
- Plan infrastructure scaling
- Predict when to add more servers

### **2. Performance Regression Testing**
- Compare results across versions
- Detect performance degradation
- Validate optimizations

### **3. SLA Verification**
- Confirm API meets SLA requirements
- Test under realistic load
- Identify bottlenecks before production

### **4. Third-Party API Testing**
- Find rate limits of external APIs
- Test client APIs before integration
- Validate vendor performance claims

### **5. Pre-Production Testing**
- Test staging environments
- Find issues before launch
- Validate deployment changes

---

## 🛠️ Advanced Configuration

### **Environment Variables**

Add to `.env` file:

```env
# Progressive Testing Defaults
PROGRESSIVE_MODE=true
MAX_ERROR_RATE=0.1
MAX_LATENCY_MS=5000
FAILURE_WINDOW=30

# Client API Authentication
API_KEY=your-api-key-here
BEARER_TOKEN=your-bearer-token-here
```

### **Custom Failure Detection**

Edit `load-engine/scripts/locustfile.py` to customize:

```python
# Adjust thresholds
MAX_ERROR_RATE = float(os.getenv("MAX_ERROR_RATE", "0.15"))  # 15%
MAX_LATENCY_MS = int(os.getenv("MAX_LATENCY_MS", "3000"))     # 3 seconds

# Custom failure logic
def check_failure_conditions():
    # Add your custom conditions here
    if custom_condition_met():
        stop_test("Custom failure reason")
```

---

## 📊 Interpreting Results

### **What Different Breaking Points Mean**

#### **1. Error Rate Exceeded**
```
Breaking Point: Error rate exceeded: 12% > 10%
```
**Meaning**: API started returning errors (4xx/5xx)
**Likely Cause**: Database connection pool exhausted, rate limiting, backend overload
**Action**: Optimize backend, increase resources, add caching

#### **2. Error Spike Detected**
```
Breaking Point: Error spike detected: 15 errors in 30s
```
**Meaning**: Sudden burst of failures
**Likely Cause**: Circuit breaker triggered, cascading failure, memory exhaustion
**Action**: Investigate specific error types, check dependencies

#### **3. Latency Threshold Exceeded**
```
Breaking Point: Average latency exceeded 5000ms
```
**Meaning**: Responses becoming too slow
**Likely Cause**: CPU saturation, slow database queries, network issues
**Action**: Profile code, optimize queries, add indexes

---

## 🔄 Comparison: Fixed vs Progressive Testing

| Aspect | Fixed Load Testing | Progressive Testing |
|--------|-------------------|---------------------|
| **Load Pattern** | Constant (e.g., 50 users) | Gradual increase (0→50) |
| **Duration** | Fixed time (e.g., 5 min) | Stops at breaking point |
| **Failure Detection** | Manual observation | Automatic |
| **Breaking Point** | Unknown | Precisely identified |
| **Max Capacity** | Not measured | Clearly shown |
| **Use Case** | Verify known capacity | Find unknown limits |

---

## 🚨 Best Practices

### **1. Start Conservative**
```json
{
  "users": 50,           // Low max
  "spawnRate": 2,        // Slow ramp
  "maxErrorRate": 0.05   // Strict threshold
}
```

### **2. Test in Stages**
1. **Baseline**: Find breaking point with defaults
2. **Optimize**: Fix issues found
3. **Retest**: Verify improvements
4. **Production**: Test with production-like data

### **3. Use Realistic Data**
- Test with production-like payloads
- Use actual authentication
- Hit representative endpoints

### **4. Monitor System Resources**
- Watch CPU, memory, disk I/O
- Monitor database connections
- Check external dependencies

### **5. Document Results**
- Save breaking point data
- Track across versions
- Share with team

---

## 🔧 Troubleshooting

### **Test Never Stops**
**Problem**: API never reaches breaking point
**Solution**: 
- Increase max users
- Decrease error rate threshold
- Check if API is auto-scaling

### **Test Stops Too Early**
**Problem**: Breaking point detected prematurely
**Solution**:
- Increase error rate threshold (e.g., 0.15 = 15%)
- Increase max latency threshold
- Check for transient errors

### **No Breaking Point Data**
**Problem**: Test completes but no breaking point shown
**Solution**:
- Ensure `progressiveMode: true`
- Check Redis connection
- Verify telemetry service running

---

## 📚 Related Documentation

- [API Endpoints Guide](./API_ENDPOINTS.md)
- [Authentication Setup](./AUTHENTICATION.md)
- [Dashboard Guide](./DASHBOARD_GUIDE.md)
- [Troubleshooting](./TROUBLESHOOTING.md)

---

## 🎉 Summary

Progressive Load Testing in ScaleSim provides:

✅ **Automatic** breaking point detection  
✅ **Real-time** performance monitoring  
✅ **Precise** capacity measurement  
✅ **Detailed** failure analysis  
✅ **No source code** access needed  
✅ **Works with any** HTTP/HTTPS API  

**Start testing API limits today!** 🚀
