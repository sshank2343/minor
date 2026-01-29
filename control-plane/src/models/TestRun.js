import mongoose from "mongoose";

const TestRunSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["CREATED", "RUNNING", "STOPPED", "FAILED", "COMPLETED"],
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
    startedAt: {
      type: Date,
    },
    finishedAt: {
      type: Date,
    },
    error: {
      type: String,
    },
  },
  { timestamps: true }
);

const TestRun = mongoose.model("TestRun", TestRunSchema);

export default TestRun;
