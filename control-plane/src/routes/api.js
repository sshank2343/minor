import express from "express";
import { startTest, stopTest } from "../controllers/testController.js";

const router = express.Router();

router.post("/start-test", startTest);
router.post("/stop-test/:id", stopTest);

export default router;
