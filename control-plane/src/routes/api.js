import express from "express";
import { 
  startTest, 
  stopTest, 
  getTestStatus, 
  getTestMetrics,
  getTestReport,
  getAllTests, 
  updateAIAnalysis 
} from "../controllers/testController.js";

const router = express.Router();

// Breaking Point Finder Endpoints
router.post("/start-test", startTest);
router.post("/stop-test/:id", stopTest);
router.get("/test/:id", getTestStatus);
router.get("/runs/:runId/metrics", getTestMetrics);
router.get("/runs/:runId/report", getTestReport);
router.get("/tests", getAllTests);
router.post("/test/:id/ai-analysis", updateAIAnalysis);
router.get("/health", (req, res) => res.json({ status: "ok", service: "control-plane" }));

export default router;

