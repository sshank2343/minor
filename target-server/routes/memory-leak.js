import express from "express";

const router = express.Router();

// Intentional memory leak
const leakedMemory = [];

router.get("/", (req, res) => {
  try {
    // Allocate memory and never release it
    for (let i = 0; i < 100000; i++) {
      leakedMemory.push(new Array(1000).fill("leak"));
    }

    req.logger.warn({
      message: "Memory leak endpoint triggered",
      type: "MEMORY_LEAK",
      heap_objects: leakedMemory.length,
    });

    res.json({
      status: "OK",
      message: "Memory leak triggered",
      heap_objects: leakedMemory.length,
    });
  } catch (error) {
    req.logger.error({
      message: "Memory leak endpoint failed",
      error: error.message,
    });

    res.status(500).json({
      status: "ERROR",
      message: "Memory leak operation failed",
    });
  }
});

export default router;
