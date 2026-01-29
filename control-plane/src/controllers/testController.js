import TestRun from "../models/TestRun.js";
import { startLoadTest } from "../services/orchestrator.js";
import { monitorContainer } from "../services/dockerMonitor.js";
import docker from "../config/docker.js";

export const startTest = async (req, res) => {
  try {
    const { 
      targetUrl, 
      users, 
      spawnRate, 
      duration,
      progressiveMode,
      autoRampMode,
      initialUsers,
      userIncrement,
      stepDuration,
      maxErrorRate,
      maxLatencyMs,
      failureWindow,
      apiKey,
      bearerToken
    } = req.body;

    if (!targetUrl || !users || !spawnRate || !duration) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const testRun = await TestRun.create({
      targetUrl,
      users,
      spawnRate,
      duration,
      progressiveMode: progressiveMode || false,
      autoRampMode: autoRampMode || false,
      initialUsers: initialUsers || 1,
      userIncrement: userIncrement || 5,
      stepDuration: stepDuration || 30,
      maxErrorRate: maxErrorRate || 0.1,
      maxLatencyMs: maxLatencyMs || 5000,
      failureWindow: failureWindow || 30,
      status: "CREATED",
    });

    // Actually start the load test container
    await startLoadTest(testRun._id.toString(), {
      targetUrl,
      users,
      spawnRate,
      duration,
      progressiveMode,
      autoRampMode,
      initialUsers,
      userIncrement,
      stepDuration,
      maxErrorRate,
      maxLatencyMs,
      failureWindow,
      apiKey,
      bearerToken
    });

    // Monitor the container for completion
    monitorContainer(`load-engine-${testRun._id}`, testRun._id.toString());

    const mode = autoRampMode ? "auto-ramp" : (progressiveMode ? "progressive" : "standard");
    return res.status(201).json({
      message: `${mode} test created and started`,
      testRun,
      mode
    });
  } catch (error) {
    console.error("Start test error:", error);
    return res.status(500).json({ message: "Failed to start test" });
  }
};

export const stopTest = async (req, res) => {
  try {
    const { id } = req.params;
    
    const testRun = await TestRun.findById(id);
    if (!testRun) {
      return res.status(404).json({ message: "Test not found" });
    }
    
    if (testRun.status !== "RUNNING") {
      return res.status(400).json({ message: "Test is not running" });
    }
    
    // Stop the container
    const containerName = `load-engine-${id}`;
    try {
      const container = docker.getContainer(containerName);
      await container.stop();
      console.log(`Stopped container: ${containerName}`);
    } catch (error) {
      console.error(`Failed to stop container ${containerName}:`, error.message);
    }
    
    // Update test status
    testRun.status = "STOPPED";
    testRun.finishedAt = new Date();
    await testRun.save();
    
    return res.json({ message: "Test stopped successfully", testRun });
  } catch (error) {
    console.error("Stop test error:", error);
    return res.status(500).json({ message: "Failed to stop test" });
  }
};
export const getTestStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const testRun = await TestRun.findById(id);

    if (!testRun) {
      return res.status(404).json({ message: "Test not found" });
    }

    return res.json({ testRun });
  } catch (error) {
    console.error("Get test status error:", error);
    return res.status(500).json({ message: "Failed to get test status" });
  }
};

export const getAllTests = async (req, res) => {
  try {
    const tests = await TestRun.find().sort({ createdAt: -1 }).limit(50);
    return res.json({ tests });
  } catch (error) {
    console.error("Get all tests error:", error);
    return res.status(500).json({ message: "Failed to get tests" });
  }
};
