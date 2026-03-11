import TestRun from "../models/TestRun.js";
import { startLoadTest } from "../services/orchestrator.js";
import { monitorContainer } from "../services/dockerMonitor.js";
import docker from "../config/docker.js";

export const startTest = async (req, res) => {
  try {
    const { 
      baseUrl, 
      endpointPath,
      method,
      headers,
      body,
      ramp,
      stopConditions
    } = req.body;

    // Validation
    if (!baseUrl || !endpointPath) {
      return res.status(400).json({ 
        message: "Missing required fields: baseUrl and endpointPath are required" 
      });
    }

    // Validate method
    const validMethods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
    const httpMethod = (method || "GET").toUpperCase();
    if (!validMethods.includes(httpMethod)) {
      return res.status(400).json({ 
        message: `Invalid method. Must be one of: ${validMethods.join(", ")}` 
      });
    }

    // Validate ramp configuration
    const rampConfig = {
      startUsers: ramp?.startUsers || 20,
      stepUsers: ramp?.stepUsers || 20,
      stepDurationSec: ramp?.stepDurationSec || 15,
      maxUsers: ramp?.maxUsers || 1000,
    };

    if (rampConfig.startUsers <= 0 || rampConfig.stepUsers <= 0 || 
        rampConfig.stepDurationSec <= 0 || rampConfig.maxUsers <= 0) {
      return res.status(400).json({ 
        message: "Ramp configuration values must be positive" 
      });
    }

    if (rampConfig.startUsers > rampConfig.maxUsers) {
      return res.status(400).json({ 
        message: "startUsers cannot exceed maxUsers" 
      });
    }

    // Validate stop conditions
    const conditions = {
      maxErrorRate: stopConditions?.maxErrorRate || 0.05,
      maxP95LatencyMs: stopConditions?.maxP95LatencyMs || 2000,
      maxTimeoutRate: stopConditions?.maxTimeoutRate || 0.03,
    };

    if (conditions.maxErrorRate <= 0 || conditions.maxErrorRate > 1) {
      return res.status(400).json({ 
        message: "maxErrorRate must be between 0 and 1" 
      });
    }

    // Create test run
    const testRun = await TestRun.create({
      baseUrl,
      endpointPath,
      method: httpMethod,
      headers: headers || {},
      body: body || null,
      ramp: rampConfig,
      stopConditions: conditions,
      status: "CREATED",
    });

    // Start the load test container
    await startLoadTest(testRun._id.toString(), {
      baseUrl,
      endpointPath,
      method: httpMethod,
      headers: headers || {},
      body: body || null,
      ramp: rampConfig,
      stopConditions: conditions,
    });

    // Monitor the container for completion
    monitorContainer(`load-engine-${testRun._id}`, testRun._id.toString());

    return res.status(201).json({
      message: `Breaking point test created and started for ${httpMethod} ${endpointPath}`,
      testRun,
      mode: "breaking-point-finder"
    });
  } catch (error) {
    console.error("Start test error:", error);
    return res.status(500).json({ message: "Failed to start test", error: error.message });
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

export const getTestMetrics = async (req, res) => {
  try {
    const { runId } = req.params;

    const testRun = await TestRun.findById(runId);

    if (!testRun) {
      return res.status(404).json({ message: "Test not found" });
    }

    // Return metrics data
    const metrics = {
      status: testRun.status,
      currentUsers: testRun.currentUsers,
      currentStage: testRun.currentStage,
      totalRequests: testRun.totalRequests,
      failedRequests: testRun.failedRequests,
      peakRps: testRun.peakRps,
      avgRps: testRun.avgRps,
      breakingPoint: testRun.breakingPoint,
      stableUsers: testRun.stableUsers,
    };

    return res.json({ metrics });
  } catch (error) {
    console.error("Get test metrics error:", error);
    return res.status(500).json({ message: "Failed to get test metrics" });
  }
};

export const getTestReport = async (req, res) => {
  try {
    const { runId } = req.params;

    const testRun = await TestRun.findById(runId);

    if (!testRun) {
      return res.status(404).json({ message: "Test not found" });
    }

    if (!testRun.aiAnalysis) {
      return res.status(404).json({ message: "AI analysis not yet available" });
    }

    return res.json({ 
      report: testRun.aiAnalysis,
      breakingPoint: testRun.breakingPoint,
      endpoint: `${testRun.method} ${testRun.endpointPath}`,
    });
  } catch (error) {
    console.error("Get test report error:", error);
    return res.status(500).json({ message: "Failed to get test report" });
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

export const updateAIAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Support both snake_case (from Python) and camelCase
    const { 
      endpoint,
      breaking_point_users, breakingPointUsers,
      stable_users, stableUsers,
      failure_type, failureType,
      root_cause, rootCause,
      evidence,
      recommendations
    } = req.body;
    
    const testRun = await TestRun.findById(id);
    if (!testRun) {
      return res.status(404).json({ message: "Test not found" });
    }
    
    testRun.aiAnalysis = {
      endpoint,
      breakingPointUsers: breaking_point_users || breakingPointUsers,
      stableUsers: stable_users || stableUsers,
      failureType: failure_type || failureType,
      rootCause: root_cause || rootCause,
      evidence,
      recommendations,
      generatedAt: new Date(),
    };
    
    await testRun.save();
    
    // Notify frontend via WebSocket that AI analysis is ready
    const io = req.app.get("io");
    if (io) {
      io.emit("ai-analysis", {
        testId: id,
        aiAnalysis: testRun.aiAnalysis,
        breakingPoint: testRun.breakingPoint,
        status: testRun.status
      });
      console.log(`✅ AI analysis notification sent for test ${id}`);
    }
    
    return res.json({ message: "AI analysis updated", testRun });
  } catch (error) {
    console.error("Update AI analysis error:", error);
    return res.status(500).json({ message: "Failed to update AI analysis" });
  }
};
