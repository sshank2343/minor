import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  try {
    const start = Date.now();

    // Simulate CPU-intensive blocking task
    let result = 0;
    for (let i = 0; i < 1e8; i++) {
      result += Math.sqrt(i);
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
