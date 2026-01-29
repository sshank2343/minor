import docker from "../config/docker.js";
import TestRun from "../models/TestRun.js";

export const monitorContainer = async (containerName, testRunId) => {
  try {
    const container = docker.getContainer(containerName);

    const stream = await container.logs({
      stdout: true,
      stderr: true,
      follow: true,
    });

    stream.on("data", async () => {
      // Container is alive, nothing to do here yet
    });

    stream.on("end", async () => {
      await TestRun.findByIdAndUpdate(testRunId, {
        status: "COMPLETED",
        finishedAt: new Date(),
      });

      console.log(`Container ${containerName} exited`);
    });
  } catch (error) {
    console.error("Docker monitor error:", error);

    await TestRun.findByIdAndUpdate(testRunId, {
      status: "FAILED",
      error: error.message,
    });
  }
};
