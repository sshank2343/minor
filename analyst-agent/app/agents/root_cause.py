from app.core.llm import get_llm
import json
import os
from pathlib import Path

llm = get_llm()


def analyze_breaking_point(test_run, breaking_point, logs=None):
    """
    Enhanced root cause analysis for breaking point failures.
    
    Args:
        test_run: TestRun data from MongoDB
        breaking_point: Breaking point metrics
        logs: Optional log entries around failure time
    
    Returns:
        Structured RCA report
    """
    
    # Extract key metrics
    endpoint = f"{test_run.get('method', 'GET')} {test_run.get('endpointPath', '/')}"
    breaking_point_users = breaking_point.get("usersAtFailure", 0)
    stable_users = max(0, breaking_point_users - test_run.get("ramp", {}).get("stepUsers", 20))
    
    error_rate = breaking_point.get("errorRate", 0)
    timeout_rate = breaking_point.get("timeoutRate", 0)
    p95_latency = breaking_point.get("p95Latency", 0)
    p99_latency = breaking_point.get("p99Latency", 0)
    reason = breaking_point.get("reason", "Unknown")
    peak_rps = breaking_point.get("peakRps", 0)
    
    # Check if test completed successfully without breaking point
    is_successful = "maximum users" in reason.lower() and "without breaking point" in reason.lower()
    
    if is_successful:
        # Test passed - generate positive recommendations
        failure_type = "success"
        root_cause = f"Endpoint successfully handled {breaking_point_users} concurrent users with stable performance: {p95_latency}ms P95 latency, {error_rate:.2%} error rate, {peak_rps} RPS peak."
    else:
        # Determine failure type and root cause using rules
        failure_type, root_cause = determine_failure_type(
            reason, error_rate, timeout_rate, p95_latency, endpoint, breaking_point
        )
    
    # Get dominant status code
    # Note: status_codes might not be in breaking_point directly, 
    # but we can infer from error patterns
    dominant_status_code = infer_dominant_status_code(breaking_point, error_rate)
    
    # Generate recommendations using LLM
    recommendations = generate_recommendations(
        endpoint, failure_type, root_cause, breaking_point_users, p95_latency, error_rate, peak_rps, is_successful
    )
    
    # Build structured report
    report = {
        "endpoint": endpoint,
        "breaking_point_users": breaking_point_users,
        "stable_users": stable_users,
        "failure_type": failure_type,
        "root_cause": root_cause,
        "evidence": {
            "p95_latency_ms": p95_latency,
            "error_rate": error_rate,
            "timeout_rate": timeout_rate,
            "dominant_status_code": dominant_status_code,
        },
        "recommendations": recommendations,
    }
    
    return report


def determine_failure_type(reason, error_rate, timeout_rate, p95_latency, endpoint, breaking_point):
    """
    Determine failure type and root cause using rule-based logic.
    """
    
    reason_lower = reason.lower()
    endpoint_lower = endpoint.lower()
    
    # Rule 1: Timeout spike
    if "timeout" in reason_lower or timeout_rate > 0.02:
        if "cpu" in endpoint_lower or "heavy" in endpoint_lower:
            return "timeouts", "CPU saturation causing event loop blocking"
        elif "io" in endpoint_lower or "database" in endpoint_lower:
            return "timeouts", "IO bottleneck or database connection pool exhaustion"
        else:
            return "timeouts", "Service overload causing request timeouts"
    
    # Rule 2: Error rate spike
    if "error rate" in reason_lower or error_rate > 0.05:
        peak_rps = breaking_point.get("peakRps", 0)
        if peak_rps > 500:
            return "errors", "Server crash under high load or unhandled exceptions"
        else:
            return "errors", "Application errors due to resource exhaustion"
    
    # Rule 3: P95 latency exceeded
    if "latency" in reason_lower or "p95" in reason_lower:
        if p95_latency > 5000:  # > 5 seconds
            if "cpu" in endpoint_lower:
                return "latency_spike", "CPU saturation causing event loop blocking"
            elif "memory" in endpoint_lower or "leak" in endpoint_lower:
                return "latency_spike", "Memory pressure causing GC pauses or OOM conditions"
            elif "io" in endpoint_lower:
                return "latency_spike", "IO bottleneck or slow external dependencies"
            else:
                return "latency_spike", "Database query slowdown or connection pool exhaustion"
        elif p95_latency > 2000:  # > 2 seconds
            return "latency_spike", "Service overload causing queue buildup"
        else:
            return "latency_spike", "Gradual performance degradation under load"
    
    # Rule 4: Rate limiting (429 errors)
    # We'd need status_codes data to detect this precisely
    # For now, infer from low error rate but still failing
    if error_rate < 0.10 and error_rate > 0:
        return "rate_limiting", "Rate limiting or throttling mechanism activated"
    
    # Default
    return "overload", "Service capacity exceeded under load"


def infer_dominant_status_code(breaking_point, error_rate):
    """
    Infer the dominant status code from breaking point data.
    """
    if error_rate > 0.10:
        return 500  # High error rate suggests 500 errors
    elif error_rate > 0.05:
        return 503  # Moderate error rate suggests service unavailable
    elif error_rate > 0:
        return 429  # Low error rate might be rate limiting
    else:
        return 200  # No errors means requests succeeded (but maybe slow)


def generate_recommendations(endpoint, failure_type, root_cause, breaking_point_users, p95_latency, error_rate, peak_rps=0, is_successful=False):
    """
    Generate actionable recommendations using LLM.
    """
    
    if is_successful:
        prompt = f"""
You are an SRE expert analyzing a successful load test.

Endpoint: {endpoint}
Max Load Tested: {breaking_point_users} concurrent users
P95 Latency: {p95_latency}ms
Error Rate: {error_rate:.2%}
Peak RPS: {peak_rps}
Result: Successfully handled load without breaking point!

Provide exactly 3 positive recommendations focused on:
1. Confirming current capacity and safe production limits
2. Future scaling strategies for growth
3. Monitoring and proactive capacity planning

Format as a JSON array of strings with emoji indicators:
["✅ recommendation 1", "🚀 recommendation 2", "📊 recommendation 3"]
"""
    else:
        prompt = f"""
You are an SRE expert analyzing a load test breaking point.

Endpoint: {endpoint}
Breaking Point: {breaking_point_users} concurrent users
Failure Type: {failure_type}
Root Cause: {root_cause}
P95 Latency: {p95_latency}ms
Error Rate: {error_rate:.2%}

Provide exactly 3 specific, actionable recommendations to fix this issue.
Focus on immediate fixes, scaling strategies, and architectural improvements.
Keep each recommendation to 1-2 sentences maximum.

Format as a JSON array of strings:
["recommendation 1", "recommendation 2", "recommendation 3"]
"""
    
    try:
        response = llm(prompt)
        # Try to parse as JSON
        try:
            recommendations = json.loads(response)
            if isinstance(recommendations, list) and len(recommendations) > 0:
                return recommendations[:3]
        except:
            pass
        
        # Fallback: split by newlines and clean up
        lines = [line.strip() for line in response.split('\n') if line.strip()]
        recommendations = []
        for line in lines:
            # Remove numbering, dashes, asterisks
            cleaned = line.lstrip('0123456789.-*• ').strip('"\'')
            if cleaned and len(cleaned) > 10:
                recommendations.append(cleaned)
        
        return recommendations[:3] if recommendations else get_default_recommendations(
            failure_type, endpoint, breaking_point_users, p95_latency, error_rate, peak_rps, is_successful
        )
        
    except Exception as e:
        print(f"LLM recommendation generation failed: {e}")
        return get_default_recommendations(
            failure_type, endpoint, breaking_point_users, p95_latency, error_rate, peak_rps, is_successful
        )


def get_default_recommendations(failure_type, endpoint, breaking_point_users, p95_latency, error_rate, peak_rps=0, is_successful=False):
    """
    Context-aware fallback recommendations based on failure type and metrics.
    Each recommendation explains WHY and provides actionable HOW.
    """
    endpoint_lower = endpoint.lower()
    recommendations = []
    
    # Success case - positive recommendations
    if is_successful or failure_type == "success":
        safe_capacity = int(breaking_point_users * 0.7)
        recommended_instances = 2
        future_capacity = breaking_point_users * recommended_instances
        
        return [
            f"✅ EXCELLENT: Your endpoint successfully handled {breaking_point_users} concurrent users with stable performance ({p95_latency}ms P95 latency, {error_rate:.2%} error rate, {peak_rps} RPS peak). RECOMMENDATION: Set production monitoring alerts at {safe_capacity} users (70% threshold) to proactively scale before reaching capacity limit.",
            f"🚀 GROWTH READY: Current single-instance capacity is {breaking_point_users} users. RECOMMENDATION: Deploy {recommended_instances}-3 instances with load balancer to support {future_capacity}-{breaking_point_users * 3} total users for future growth. Keep per-instance load at {breaking_point_users // 2}-{breaking_point_users} users for optimal performance.",
            f"📊 PROACTIVE SCALING: To prevent capacity issues during traffic spikes, RECOMMENDATION: Implement auto-scaling at {safe_capacity} users with 2-5 replica range. Add synthetic load testing (weekly) to verify capacity post-deployments. Current safe production limit: {safe_capacity} concurrent users."
        ]
    
    # Timeouts - CPU/IO blocking
    if failure_type == "timeouts":
        if "cpu" in endpoint_lower:
            recommendations = [
                f"⚠️ REASON: Synchronous CPU operations (detected {p95_latency}ms latency) are blocking Node.js event loop, preventing new requests from being processed. SOLUTION: Refactor to use Worker Threads or move heavy computation to background jobs (Bull/BullMQ). This will allow the main thread to handle {breaking_point_users}+ concurrent users.",
                f"🔧 REASON: Single-threaded Node.js cannot utilize multiple CPU cores efficiently at scale. SOLUTION: Deploy using PM2 cluster mode (`pm2 start app.js -i max`) or Kubernetes with horizontal pod autoscaling. Target: 3-5 pods to distribute {breaking_point_users} users across instances.",
                f"⏱️ REASON: No timeout protection causes resource exhaustion when slow operations pile up. SOLUTION: Add request timeout middleware (e.g., 5 seconds) and circuit breaker pattern to fail-fast and prevent cascade failures under load."
            ]
        elif "io" in endpoint_lower or "database" in endpoint_lower:
            recommendations = [
                f"🗄️ REASON: Database connection pool exhausted at {breaking_point_users} users causing {p95_latency}ms wait times. SOLUTION: Increase pool size to {breaking_point_users * 2} connections and add pgBouncer/ProxySQL for connection pooling. Monitor active connections.",
                f"💾 REASON: Every request hits the database causing I/O bottleneck. SOLUTION: Implement Redis caching layer with 5-10 minute TTL for read-heavy queries. This can reduce database load by 70-90% and support 5-10x more users.",
                f"📊 REASON: Single database instance cannot handle concurrent queries at scale. SOLUTION: Add read replicas (2-3 instances) and implement read/write splitting. Route SELECT queries to replicas to handle {breaking_point_users * 3}+ concurrent reads."
            ]
        else:
            recommendations = [
                f"🚨 REASON: Service capacity exceeded at {breaking_point_users} users with {p95_latency}ms P95 latency indicating queue buildup. SOLUTION: Implement request queue with max size limit ({breaking_point_users}) and return 503 Service Unavailable when queue is full to prevent memory exhaustion.",
                f"⚖️ REASON: All load hitting a single instance. SOLUTION: Deploy load balancer (nginx/ALB) with 2-3 application instances. Use round-robin distribution to handle {breaking_point_users * 2}-{breaking_point_users * 3} total users while keeping per-instance load manageable.",
                f"🔍 REASON: Unknown bottleneck causing timeouts. SOLUTION: Add APM tool (New Relic/DataDog) to identify slow code paths. Profile application under load to find functions consuming >100ms and optimize them."
            ]
    
    # Errors - application crashes
    elif failure_type == "errors":
        if error_rate > 0.20:
            recommendations = [
                f"💥 REASON: Application crashing at {breaking_point_users} users with {error_rate:.1%} error rate - likely unhandled exceptions or resource limits (memory/file handles). SOLUTION: Add comprehensive try-catch blocks, implement graceful shutdown handlers, and increase Node.js memory limit (--max-old-space-size=4096).",
                f"🔄 REASON: No error recovery causing cascade failures. SOLUTION: Implement error boundaries and graceful degradation. When errors occur, return cached/default data instead of 500 errors. Add health checks (`/health`) and automatic container restarts on failure.",
                f"📝 REASON: Missing resource cleanup causing leaks under concurrency. SOLUTION: Audit code for unclosed connections, event listeners, and timers. Use Node.js `wtfnode` to detect leaks. Implement proper cleanup in finally blocks and process exit handlers."
            ]
        else:
            recommendations = [
                f"⚡ REASON: Sporadic errors ({error_rate:.1%}) indicate race conditions or resource contention at {breaking_point_users} concurrent users. SOLUTION: Add database transaction locks, implement idempotency keys for critical operations, and use atomic operations (Redis INCR instead of GET+SET).",
                f"🛡️ REASON: Some requests failing under high load but most succeeding. SOLUTION: Add circuit breaker pattern (use `opossum` library) to temporarily block requests to failing dependencies. Implement retry logic with exponential backoff for transient failures.",
                f"📈 REASON: Current single instance cannot reliably handle {breaking_point_users}+ users. SOLUTION: Scale horizontally to 2-3 instances behind load balancer. Target: <{breaking_point_users // 2} users per instance to maintain <1% error rate."
            ]
    
    # Latency spike - performance degradation  
    elif failure_type == "latency_spike":
        if p95_latency > 10000:  # > 10 seconds
            if "cpu" in endpoint_lower:
                recommendations = [
                    f"🐌 REASON: Detected {p95_latency}ms (>{p95_latency/1000:.1f} seconds!) response time due to CPU-intensive synchronous code (likely millions of operations per request). SOLUTION: Break down computation into smaller chunks using setImmediate() or move entire operation to background worker. Target: <500ms response time.",
                    f"📦 REASON: Computing same result repeatedly for every request wastes CPU. SOLUTION: Implement Redis caching for computation results. Cache key: `${'{'}endpoint{'}'}_${'{'}inputHash{'}'}`, TTL: 1 hour. This can reduce latency from {p95_latency}ms to <50ms for cached requests.",
                    f"🎯 REASON: Algorithm has O(n²) or worse complexity causing exponential slowdown. SOLUTION: Review algorithm - if doing 1 billion operations, optimize to use more efficient data structures (HashMap vs Array) or approximation algorithms. Target: 99% reduction in operations."
                ]
            elif "memory" in endpoint_lower:
                recommendations = [
                    f"🧠 REASON: Memory leak causing frequent garbage collection pauses ({p95_latency}ms latency spikes). SOLUTION: Profile heap with Chrome DevTools, identify growing objects, fix leaks in closures/event listeners. Set memory limit and restart pod automatically when usage >80%.",
                    f"♻️ REASON: Excessive object creation triggering GC pauses. SOLUTION: Use object pooling for frequently created objects, avoid unnecessary array copies, use streaming for large data. Monitor GC metrics - if GC takes >10% CPU, optimize memory usage.",
                    f"⚠️ REASON: Approaching Out-Of-Memory at {breaking_point_users} users. SOLUTION: Scale horizontally before OOM occurs. Add memory-based auto-scaling trigger at 75% memory usage. Current capacity: {breaking_point_users} users, target: {breaking_point_users // 2} users per pod with 3+ pods."
                ]
            else:
                recommendations = [
                    f"🐢 REASON: Database queries taking {p95_latency}ms - likely missing indexes or N+1 query problem. SOLUTION: Add database indexes on WHERE/JOIN columns, use query.explain() to find slow queries, implement pagination (LIMIT/OFFSET) for large result sets.",
                    f"💾 REASON: Database connection pool exhausted causing {p95_latency}ms wait time. SOLUTION: Increase pool size from default (10) to {breaking_point_users} connections, add connection timeout (30s), implement connection retry logic with exponential backoff.",
                    f"🏎️ REASON: Fetching too much data from database/API. SOLUTION: Implement aggressive caching (Redis) with 5-minute TTL for read operations. Add CDN for static content. Use pagination and lazy loading to reduce data transfer by 80%+."
                ]
        elif p95_latency > 2000:  # > 2 seconds
            recommendations = [
                f"⏱️ REASON: {p95_latency}ms latency at {breaking_point_users} users indicates service overload and queue buildup. SOLUTION: Optimize critical path - profile code, identify functions >100ms, add database indexes, reduce external API calls. Target: <500ms P95 latency.",
                f"🌐 REASON: Network/CDN not utilized, all traffic hitting origin server. SOLUTION: Use CDN (CloudFront/Cloudflare) for static assets, implement edge caching with 1-hour TTL, enable gzip compression to reduce payload size by 60-80%.",
                f"⚖️ REASON: Single instance overloaded at {breaking_point_users} users. SOLUTION: Add horizontal auto-scaling: min 2 replicas, max 10 replicas, scale up at 70% CPU. Target: 1 new instance per {breaking_point_users // 2} additional users."
            ]
        else:
            recommendations = [
                f"📉 REASON: Gradual performance degradation ({p95_latency}ms) as load increases to {breaking_point_users} users. SOLUTION: Implement connection pooling (database, Redis, HTTP clients) to reuse connections. Add keep-alive headers to avoid connection overhead.",
                f"🔄 REASON: No auto-scaling causing manual capacity management. SOLUTION: Configure Kubernetes HPA (Horizontal Pod Autoscaler) to scale at 60% CPU/memory. Current capacity: {breaking_point_users} users, auto-scale target: maintain <500ms latency at any load.",
                f"🎭 REASON: Multiple small operations per request adding up to {p95_latency}ms. SOLUTION: Implement request coalescing/batching for similar operations (e.g., batch 10 database queries into 1), use DataLoader pattern to deduplicate requests within same request cycle."
            ]
    
    # Rate limiting
    elif failure_type == "rate_limiting":
        recommendations = [
            f"🚦 REASON: Rate limiter triggered at {breaking_point_users} concurrent users (likely {breaking_point_users * 10}+ requests/min). SOLUTION: Increase rate limit threshold to {breaking_point_users * 20} req/min or implement token bucket algorithm with burst capacity of {breaking_point_users * 5} requests.",
            f"🔀 REASON: Single-instance rate limiting doesn't scale horizontally. SOLUTION: Implement distributed rate limiting using Redis sliding window algorithm. Key: `rate_limit:${'{'}userId{'}'}`, increment per request, expire after 1 minute. This allows scaling while maintaining limits.",
            f"⏳ REASON: Requests rejected immediately when rate limit hit. SOLUTION: Implement request queue with 30-second timeout instead of immediate rejection. Add 'Retry-After' header to inform clients when to retry. This improves user experience and throughput."
        ]
    
    # Generic overload
    else:
        if p95_latency > 5000:
            recommendations = [
                f"🔥 REASON: Critical overload at {breaking_point_users} users with {p95_latency}ms latency - service cannot handle current load. SOLUTION: IMMEDIATE: Add manual horizontal scaling (2-3 instances) with load balancer. URGENT: Profile application to identify bottleneck causing {p95_latency}ms delays.",
                f"🚀 REASON: No auto-scaling = manual capacity management during spike. SOLUTION: Configure auto-scaling to maintain 60-70% resource utilization. Set HPA rules: min 2 pods, max 10 pods, scale up at 60% CPU, scale down at 30% CPU after 5-minute cooldown.",
                f"🎯 REASON: Need immediate capacity increase. SOLUTION: Scale to 3 instances NOW to support {breaking_point_users * 3} users. Long-term: implement APM monitoring, optimize hot paths identified in flame graphs, add caching layer to reduce load by 70%."
            ]
        else:
            recommendations = [
                f"📊 REASON: Reached capacity limit at {breaking_point_users} concurrent users before latency/errors became critical. SOLUTION: This is your current safe capacity. Add monitoring alert at {int(breaking_point_users * 0.7)} users (70% threshold) to scale proactively before hitting limit.",
                f"⚖️ REASON: Need higher capacity for growth/spike handling. SOLUTION: Deploy load balancer with 2-3 application instances to support {breaking_point_users * 2}-{breaking_point_users * 3} total users. Each instance safely handles {breaking_point_users // 2}-{breaking_point_users} users.",
                f"📈 REASON: Want to prevent reaching breaking point in production. SOLUTION: Implement auto-scaling at 70% of capacity ({int(breaking_point_users * 0.7)} users) with 30-second scale-up time. Add synthetic monitoring to test capacity weekly and adjust thresholds accordingly."
            ]
    
    return recommendations[:3]


def analyze_log_entry(log: dict):
    """Legacy function for single log entry analysis"""
    prompt = f"""
You are an SRE AI agent.

Given the following log entry from a backend system, identify:
1. The probable issue type (CPU, Memory, I/O, Network, Unknown)
2. A one-line explanation

Log Entry:
{log}
"""
    try:
        response = llm(prompt)
        print("AI Log Analysis:", response)
    except Exception as e:
        print("LLM log analysis failed:", e)


def analyze_metrics(df):
    """Legacy function for metrics analysis"""
    summary = df.describe().to_string()

    prompt = f"""
You are an SRE AI agent.

Given the following performance metrics summary, identify:
1. The primary bottleneck
2. Supporting evidence
3. A concise recommendation

Metrics Summary:
{summary}
"""
    try:
        response = llm(prompt)
        print("AI Metrics Analysis:", response)
    except Exception as e:
        print("LLM metrics analysis failed:", e)
