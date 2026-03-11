import express from "express";

const router = express.Router();

/**
 * 🎓 DEMO ENDPOINT - Perfect for Professor Demonstrations
 * 
 * This endpoint simulates a realistic API that:
 * - Starts fast and responsive
 * - Gradually degrades under increasing load
 * - Shows clear breaking point
 * - Demonstrates: latency spike, error increase, capacity limits
 * 
 * Breaking Point: ~150-200 concurrent users
 * Behavior:
 * - 0-50 users: Fast (10-30ms), 0% errors
 * - 50-100 users: Moderate (30-100ms), 0% errors
 * - 100-150 users: Slow (100-500ms), <1% errors
 * - 150-200 users: Very slow (500-2000ms), 5-10% errors ← Breaking Point
 * - 200+ users: Critical (2000-5000ms), 20%+ errors ← System failure
 */

// Track request counts for realistic load simulation
let totalRequests = 0;
let activeRequests = 0;
let peakActiveRequests = 0;

router.get("/", async (req, res) => {
  const startTime = Date.now();
  const requestId = ++totalRequests;
  
  try {
    // Track active concurrent requests
    activeRequests++;
    if (activeRequests > peakActiveRequests) {
      peakActiveRequests = activeRequests;
    }
    const currentLoad = activeRequests;
    
    // Calculate performance degradation based on load
    let baseLatency;
    let errorProbability;
    let variance;
    
    if (currentLoad <= 50) {
      // Phase 1: Optimal performance (0-50 users)
      baseLatency = 15;
      variance = 10;
      errorProbability = 0;
    } else if (currentLoad <= 100) {
      // Phase 2: Good performance (50-100 users)
      baseLatency = 50;
      variance = 30;
      errorProbability = 0;
    } else if (currentLoad <= 150) {
      // Phase 3: Degrading performance (100-150 users)
      const overload = currentLoad - 100;
      baseLatency = 100 + (overload * 8);
      variance = 100;
      errorProbability = overload * 0.002;
    } else if (currentLoad <= 200) {
      // Phase 4: Critical performance (150-200 users) ← BREAKING POINT ZONE
      const overload = currentLoad - 150;
      baseLatency = 500 + (overload * 30);
      variance = 500;
      errorProbability = 0.05 + (overload * 0.003);
    } else {
      // Phase 5: System failure (200+ users)
      const overload = currentLoad - 200;
      baseLatency = 2000 + (overload * 15);
      variance = 1000;
      errorProbability = 0.20 + (overload * 0.002);
    }
    
    // Add randomness to make it realistic
    const actualLatency = Math.max(5, baseLatency + (Math.random() * variance * 2 - variance));
    
    // Simulate random errors under high load
    const shouldError = Math.random() < errorProbability;
    
    // Wait for simulated work
    await new Promise(resolve => setTimeout(resolve, actualLatency));
    
    // Release request tracking
    activeRequests = Math.max(0, activeRequests - 1);
    
    // Return error if triggered
    if (shouldError) {
      activeRequests = Math.max(0, activeRequests - 1);
      return res.status(503).json({
        error: "Service Temporarily Unavailable",
        reason: "Service overloaded - capacity exceeded",
        currentLoad,
        peakLoad: peakActiveRequests,
        latency: Date.now() - startTime,
      });
    }
    
    // Success response
    res.status(200).json({
      status: "success",
      message: "API responded successfully",
      data: {
        timestamp: new Date().toISOString(),
        requestId: Math.random().toString(36).substring(7),
        processedIn: Date.now() - startTime,
        currentLoad,
        performanceZone: getPerformanceZone(currentLoad),
      },
    });
    
  } catch (error) {
    activeRequests = Math.max(0, activeRequests - 1);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
});

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    activeRequests,
    peakActiveRequests,
    totalRequests,
  });
});

function getPerformanceZone(load) {
  if (load <= 50) return "optimal";
  if (load <= 100) return "good";
  if (load <= 150) return "degraded";
  if (load <= 200) return "critical";
  return "failure";
}

export default router;
