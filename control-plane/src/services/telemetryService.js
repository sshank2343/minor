import { getRedisClient } from "../config/redis.js";
import TestRun from "../models/TestRun.js";
import axios from "axios";

let io;

export const initTelemetryService = (socketIO) => {
  io = socketIO;
};

const triggerAIAnalysis = async (testId, breakingPoint) => {
  try {
    console.log(`🤖 Triggering AI analysis for test ${testId}`);
    
    // Call analyst-agent to trigger analysis
    await axios.post(`http://analyst-agent:8000/analyze/${testId}`, {
      breakingPoint
    }, {
      timeout: 5000
    });
    
    console.log(`✅ AI analysis triggered for test ${testId}`);
    
  } catch (error) {
    console.error("Failed to trigger AI analysis:", error.message);
  }
};

export const startTelemetryListener = async () => {
  const redis = getRedisClient();

  if (!redis) {
    throw new Error("Redis client not initialized");
  }

  const subscriber = redis.duplicate();
  await subscriber.connect();

  await subscriber.subscribe("telemetry", async (message) => {
    try {
      const data = JSON.parse(message);
      
      // Handle breaking point event
      if (data.type === "BREAKING_POINT" && data.breaking_point) {
        console.log("🚨 Breaking point detected:", data.breaking_point);
        
        // Find the most recent running test and update it
        const runningTest = await TestRun.findOne({ status: "RUNNING" })
          .sort({ createdAt: -1 });
          
        if (runningTest) {
          runningTest.status = "BREAKING_POINT";
          runningTest.breakingPoint = {
            reason: data.breaking_point.reason,
            totalRequests: data.breaking_point.total_requests,
            failedRequests: data.breaking_point.failed_requests,
            errorRate: data.breaking_point.error_rate,
            timeoutRate: data.breaking_point.timeout_rate || 0,
            timestamp: new Date(data.breaking_point.timestamp * 1000),
            usersAtFailure: data.breaking_point.users_at_failure,
            currentRps: data.breaking_point.current_rps || 0,
            peakRps: data.breaking_point.peak_rps || 0,
            avgRps: data.breaking_point.avg_rps || 0,
            elapsedTime: data.breaking_point.elapsed_time || 0,
            p50Latency: data.breaking_point.p50_latency || 0,
            p95Latency: data.breaking_point.p95_latency || 0,
            p99Latency: data.breaking_point.p99_latency || 0,
          };
          runningTest.stableUsers = Math.max(0, (data.breaking_point.users_at_failure || runningTest.currentUsers) - runningTest.ramp.stepUsers);
          runningTest.peakRps = data.breaking_point.peak_rps || 0;
          runningTest.avgRps = data.breaking_point.avg_rps || 0;
          runningTest.totalRequests = data.breaking_point.total_requests || 0;
          runningTest.failedRequests = data.breaking_point.failed_requests || 0;
          runningTest.finishedAt = new Date();
          await runningTest.save();
          
          console.log(`Test ${runningTest._id} marked as BREAKING_POINT at ${runningTest.breakingPoint.usersAtFailure} users, ${runningTest.peakRps} peak RPS`);
          
          // Emit breaking point event to frontend
          if (io) {
            io.emit("breaking-point", {
              testId: runningTest._id.toString(),
              breakingPoint: runningTest.breakingPoint,
              stableUsers: runningTest.stableUsers,
            });
          }
          
          // Trigger AI analysis
          await triggerAIAnalysis(runningTest._id.toString(), runningTest.breakingPoint);
        }
      }
      // Handle live metrics streaming
      else if (data.users !== undefined) {
        // Update current test with live metrics
        const runningTest = await TestRun.findOne({ status: "RUNNING" })
          .sort({ createdAt: -1 });
          
        if (runningTest) {
          runningTest.currentUsers = data.users || runningTest.currentUsers;
          runningTest.totalRequests = data.total_requests || runningTest.totalRequests;
          runningTest.failedRequests = data.failed_requests || runningTest.failedRequests;
          runningTest.peakRps = Math.max(runningTest.peakRps || 0, data.rps || 0);
          await runningTest.save();
        }
        
        // Stream enhanced metrics to frontend
        if (io) {
          io.emit("telemetry", {
            timestamp: data.timestamp,
            users: data.users,
            rampStage: data.ramp_stage,
            rps: data.rps,
            avgLatency: data.avg_latency,
            p50Latency: data.p50_latency,
            p95Latency: data.p95_latency,
            p99Latency: data.p99_latency,
            errorRate: data.error_rate,
            timeoutRate: data.timeout_rate,
            statusCodes: data.status_codes,
            totalRequests: data.total_requests,
            failedRequests: data.failed_requests,
          });
        }
      }
    } catch (err) {
      console.error("Telemetry parse error:", err);
    }
  });

  console.log("Telemetry service listening on Redis channel: telemetry");
};
