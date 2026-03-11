import express from "express";

const router = express.Router();

/**
 * 🎓 MODERATE-LOAD ENDPOINT - Perfect for Professor Demonstrations
 * 
 * This endpoint is designed to show CLEAR, VISIBLE graph patterns:
 * - Fast initial performance
 * - Gradual, predictable degradation  
 * - Clear breaking point
 * - All 3 graphs will show meaningful data
 * 
 * Breaking Point: ~80-100 concurrent users
 * Perfect for 2-3 minute demonstrations
 */

// Tracking variables
let requestCount = 0;
let activeCount = 0;
const startTime = Date.now();

router.get("/", async (req, res) => {
  const reqStart = Date.now();
  requestCount++;
  activeCount++;
  
  const currentLoad = activeCount;
  
  try {
    // Calculate latency based on current load
    // This creates a CLEAR exponential curve that's easy to see on graphs
    let responseTime;
    let errorChance;
    
    if (currentLoad <= 20) {
      // Phase 1: Fast and stable (0-20 users)
      responseTime = 20 + Math.random() * 30;  // 20-50ms
      errorChance = 0;
    } else if (currentLoad <= 40) {
      // Phase 2: Still good (20-40 users)
      responseTime = 50 + Math.random() * 50;  // 50-100ms
      errorChance = 0;
    } else if (currentLoad <= 60) {
      // Phase 3: Getting slower (40-60 users)
      const factor = (currentLoad - 40) / 20;  // 0 to 1
      responseTime = 100 + (factor * 200) + Math.random() * 100;  // 100-400ms
      errorChance = factor * 0.02;  // 0-2% errors
    } else if (currentLoad <= 80) {
      // Phase 4: Degrading (60-80 users)
      const factor = (currentLoad - 60) / 20;  // 0 to 1
      responseTime = 300 + (factor * 500) + Math.random() * 200;  // 300-1000ms
      errorChance = 0.02 + (factor * 0.03);  // 2-5% errors
    } else if (currentLoad <= 100) {
      // Phase 5: BREAKING POINT ZONE (80-100 users)
      const factor = (currentLoad - 80) / 20;  // 0 to 1
      responseTime = 800 + (factor * 700) + Math.random() * 300;  // 800-1800ms
      errorChance = 0.05 + (factor * 0.05);  // 5-10% errors
    } else {
      // Phase 6: BROKEN (100+ users)
      const overload = currentLoad - 100;
      responseTime = 1500 + (overload * 50) + Math.random() * 500;  // 1500ms+
      errorChance = 0.10 + (overload * 0.01);  // 10%+ errors
    }
    
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, responseTime));
    
    activeCount--;
    
    // Random error based on load
    if (Math.random() < errorChance) {
      req.logger.info({
        message: "Moderate load endpoint overloaded",
        type: "OVERLOAD",
        currentLoad,
        duration_ms: Date.now() - reqStart,
      });
      
      return res.status(503).json({
        error: "Service Unavailable",
        reason: "System overloaded",
        currentLoad,
        latency: Date.now() - reqStart,
      });
    }
    
    // Success
    req.logger.info({
      message: "Moderate load endpoint executed",
      type: "MODERATE_LOAD",
      duration_ms: Date.now() - reqStart,
      currentLoad,
    });
    
    res.json({
      success: true,
      data: {
        requestId: requestCount,
        processedIn: Date.now() - reqStart,
        currentLoad,
        uptime: Math.floor((Date.now() - startTime) / 1000),
      },
    });
    
  } catch (error) {
    activeCount--;
    req.logger.error({
      message: "Moderate load endpoint failed",
      error: error.message,
    });
    res.status(500).json({ error: error.message });
  }
});

export default router;
