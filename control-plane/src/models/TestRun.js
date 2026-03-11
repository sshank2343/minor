import mongoose from "mongoose";

const TestRunSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["CREATED", "RUNNING", "STOPPED", "FAILED", "COMPLETED", "BREAKING_POINT"],
      default: "CREATED",
    },
    // Single Endpoint Configuration
    baseUrl: {
      type: String,
      required: true,
    },
    endpointPath: {
      type: String,
      required: true,
    },
    method: {
      type: String,
      enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      default: "GET",
    },
    headers: {
      type: Map,
      of: String,
      default: {},
    },
    body: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    // Ramp Configuration
    ramp: {
      startUsers: {
        type: Number,
        required: true,
        default: 20,
      },
      stepUsers: {
        type: Number,
        required: true,
        default: 20,
      },
      stepDurationSec: {
        type: Number,
        required: true,
        default: 15,
      },
      maxUsers: {
        type: Number,
        required: true,
        default: 1000,
      },
    },
    // Stop Conditions
    stopConditions: {
      maxErrorRate: {
        type: Number,
        default: 0.05, // 5%
      },
      maxP95LatencyMs: {
        type: Number,
        default: 2000, // 2 seconds
      },
      maxTimeoutRate: {
        type: Number,
        default: 0.03, // 3%
      },
    },
    // Test Execution Results
    startedAt: {
      type: Date,
    },
    finishedAt: {
      type: Date,
    },
    currentUsers: {
      type: Number,
      default: 0,
    },
    currentStage: {
      type: Number,
      default: 0,
    },
    // Breaking Point Data
    breakingPoint: {
      reason: String,
      totalRequests: Number,
      failedRequests: Number,
      errorRate: Number,
      timeoutRate: Number,
      timestamp: Date,
      usersAtFailure: Number,
      currentRps: Number,
      peakRps: Number,
      avgRps: Number,
      elapsedTime: Number,
      p50Latency: Number,
      p95Latency: Number,
      p99Latency: Number,
    },
    stableUsers: {
      type: Number,
    },
    peakRps: {
      type: Number,
    },
    avgRps: {
      type: Number,
    },
    totalRequests: {
      type: Number,
      default: 0,
    },
    failedRequests: {
      type: Number,
      default: 0,
    },
    error: {
      type: String,
    },
    // AI Analysis
    aiAnalysis: {
      endpoint: String,
      breakingPointUsers: Number,
      stableUsers: Number,
      failureType: String,
      rootCause: String,
      evidence: {
        p95LatencyMs: Number,
        errorRate: Number,
        timeoutRate: Number,
        dominantStatusCode: Number,
      },
      recommendations: [String],
      generatedAt: Date,
    },
  },
  { timestamps: true }
);

const TestRun = mongoose.model("TestRun", TestRunSchema);

export default TestRun;
