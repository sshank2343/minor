import { getRedisClient } from "../config/redis.js";
import TestRun from "../models/TestRun.js";

let io;

export const initTelemetryService = (socketIO) => {
  io = socketIO;
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
            timestamp: new Date(data.breaking_point.timestamp * 1000),
            usersAtFailure: data.breaking_point.users_at_failure || runningTest.users,
            currentRps: data.breaking_point.current_rps || 0,
            peakRps: data.breaking_point.peak_rps || 0,
            avgRps: data.breaking_point.avg_rps || 0,
            elapsedTime: data.breaking_point.elapsed_time || 0,
          };
          runningTest.maxStableUsers = data.breaking_point.users_at_failure || runningTest.users;
          runningTest.peakRps = data.breaking_point.peak_rps || 0;
          runningTest.avgRps = data.breaking_point.avg_rps || 0;
          runningTest.finishedAt = new Date();
          await runningTest.save();
          
          console.log(`Test ${runningTest._id} marked as BREAKING_POINT with ${runningTest.peakRps} peak RPS`);
        }
      }

      if (io) {
        io.emit("telemetry", data);
      }
    } catch (err) {
      console.error("Telemetry parse error:", err);
    }
  });

  console.log("Telemetry service listening on Redis channel: telemetry");
};
