import docker from "../config/docker.js";
import TestRun from "../models/TestRun.js";

const LOAD_ENGINE_IMAGE = "scalesim-load-engine";

export const startLoadTest = async (testRunId, params) => {
  try {
    const container = await docker.createContainer({
      Image: LOAD_ENGINE_IMAGE,
      name: `load-engine-${testRunId}`,
      Env: [
        `TARGET_URL=${params.targetUrl}`,
        `USERS=${params.users}`,
        `SPAWN_RATE=${params.spawnRate}`,
        `DURATION=${params.duration}`,
        `REDIS_URL=${process.env.REDIS_URL}`,
      ],
      HostConfig: {
        AutoRemove: true,
      },
    });

    await container.start();

    await TestRun.findByIdAndUpdate(testRunId, {
      status: "RUNNING",
      startedAt: new Date(),
    });

    console.log(`Load test started for ${testRunId}`);
  } catch (error) {
    console.error("Failed to start load test:", error);

    await TestRun.findByIdAndUpdate(testRunId, {
      status: "FAILED",
      error: error.message,
    });
  }
};

export const stopLoadTest = async (testRunId) => {
  try {
    const container = docker.getContainer(`load-engine-${testRunId}`);
    await container.stop();

    await TestRun.findByIdAndUpdate(testRunId, {
      status: "STOPPED",
      finishedAt: new Date(),
    });

    console.log(`Load test stopped for ${testRunId}`);
  } catch (error) {
    console.error("Failed to stop load test:", error);
  }
};
