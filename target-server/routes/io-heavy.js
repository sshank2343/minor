import express from "express";
import fs from "fs";
import path from "path";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const filePath = path.join("/tmp", "io-heavy.txt");

    // Simulate heavy disk I/O
    for (let i = 0; i < 100; i++) {
      fs.writeFileSync(filePath, "Simulating heavy IO operation\n", {
        flag: "a",
      });
    }

    req.logger.info({
      message: "IO heavy endpoint executed",
      type: "IO_BLOCK",
    });

    res.json({
      status: "OK",
      message: "IO heavy operation completed",
    });
  } catch (error) {
    req.logger.error({
      message: "IO heavy endpoint failed",
      error: error.message,
    });

    res.status(500).json({
      status: "ERROR",
      message: "IO heavy operation failed",
    });
  }
});

export default router;
