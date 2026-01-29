import express from "express";
import healthyRoute from "./healthy.js";
import ioHeavyRoute from "./io-heavy.js";
import cpuHeavyRoute from "./cpu-heavy.js";
import memoryLeakRoute from "./memory-leak.js";

const router = express.Router();

router.use("/healthy", healthyRoute);
router.use("/io-heavy", ioHeavyRoute);
router.use("/cpu-heavy", cpuHeavyRoute);
router.use("/memory-leak", memoryLeakRoute);

export default router;
