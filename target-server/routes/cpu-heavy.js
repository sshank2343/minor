import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  try {
    const start = Date.now();

    // Simulate CPU-intensive blocking task (20 million operations)
    // This will take ~200-500ms depending on system, and degrade under load
    // Breaking point typically around 50-100 users
    let result = 0;
    for (let i = 0; i < 2e7; i++) {
      result += Math.sqrt(i) * Math.random();
    }

    const duration = Date.now() - start;

    req.logger.info({
      message: "CPU heavy endpoint executed",
      type: "CPU_BLOCK",
      duration_ms: duration,
    });

    res.json({
      status: "OK",
      message: "CPU heavy operation completed",
      duration_ms: duration,
    });
  } catch (error) {
    req.logger.error({
      message: "CPU heavy endpoint failed",
      error: error.message,
    });

    res.status(500).json({
      status: "ERROR",
      message: "CPU heavy operation failed",
    });
  }
});

export default router;
