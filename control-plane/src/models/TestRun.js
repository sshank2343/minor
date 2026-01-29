import mongoose from "mongoose";

const TestRunSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["CREATED", "RUNNING", "STOPPED", "FAILED", "COMPLETED", "BREAKING_POINT"],
      default: "CREATED",
    },
    targetUrl: {
      type: String,
      required: true,
    },
    users: {
      type: Number,
      required: true,
    },
    spawnRate: {
      type: Number,
      required: true,
    },
    duration: {
      type: Number, // seconds
      required: true,
    },
    // Progressive test configuration
    progressiveMode: {
      type: Boolean,
      default: false,
    },
    autoRampMode: {
      type: Boolean,
      default: false,
    },
    initialUsers: {
      type: Number,
      default: 1,
    },
    userIncrement: {
      type: Number,
      default: 5,
    },
    stepDuration: {
      type: Number,
      default: 30,
    },
    maxErrorRate: {
      type: Number,
      default: 0.1, // 10%
    },
    maxLatencyMs: {
      type: Number,
      default: 5000, // 5 seconds
    },
    failureWindow: {
      type: Number,
      default: 30, // seconds
    },
    // Results with RPS data
    startedAt: {
      type: Date,
    },
    finishedAt: {
      type: Date,
    },
    breakingPoint: {
      reason: String,
      totalRequests: Number,
      failedRequests: Number,
      errorRate: Number,
      timestamp: Date,
      usersAtFailure: Number,
      currentRps: Number,
      peakRps: Number,
      avgRps: Number,
      elapsedTime: Number,
    },
    maxStableUsers: {
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
  },
  { timestamps: true }
);

const TestRun = mongoose.model("TestRun", TestRunSchema);

export default TestRun;
