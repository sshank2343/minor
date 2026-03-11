import docker from "../config/docker.js";
import TestRun from "../models/TestRun.js";

const LOAD_ENGINE_IMAGE = "scalesim-load-engine";

export const startLoadTest = async (testRunId, params) => {
  try {
    const envVars = [
      `TARGET_BASE_URL=${params.baseUrl}`,
      `ENDPOINT_PATH=${params.endpointPath}`,
      `METHOD=${params.method}`,
      `REDIS_URL=${process.env.REDIS_URL}`,
      `TEST_RUN_ID=${testRunId}`,
    ];
    
    // Add ramp configuration for breaking point finder
    envVars.push(`AUTO_DISCOVERY_MODE=${params.autoDiscoveryMode || false}`);
    envVars.push(`START_USERS=${params.ramp.startUsers}`);
    envVars.push(`STEP_USERS=${params.ramp.stepUsers || 20}`);
    envVars.push(`STEP_DURATION=${params.ramp.stepDurationSec}`);
    envVars.push(`MAX_USERS=${params.ramp.maxUsers}`);
    
    // Add stop conditions
    envVars.push(`MAX_ERROR_RATE=${params.stopConditions.maxErrorRate}`);
    envVars.push(`MAX_P95_LATENCY_MS=${params.stopConditions.maxP95LatencyMs}`);
    envVars.push(`MAX_TIMEOUT_RATE=${params.stopConditions.maxTimeoutRate}`);
    
    // Add headers as JSON string if provided
    if (params.headers && Object.keys(params.headers).length > 0) {
      envVars.push(`HEADERS=${JSON.stringify(params.headers)}`);
    }
    
    // Add body as JSON string if provided (for POST/PUT/PATCH)
    if (params.body) {
      envVars.push(`BODY=${JSON.stringify(params.body)}`);
    }
    
    const container = await docker.createContainer({
      Image: LOAD_ENGINE_IMAGE,
      name: `load-engine-${testRunId}`,
      Env: envVars,
      HostConfig: {
        AutoRemove: false,
        NetworkMode: "scalesim_default",
      },
    });

    await container.start();

    await TestRun.findByIdAndUpdate(testRunId, {
      status: "RUNNING",
      startedAt: new Date(),
      currentUsers: params.ramp.startUsers,
      currentStage: 0,
    });

    console.log(`Breaking point test started for ${testRunId}: ${params.method} ${params.endpointPath}`);
  } catch (error) {
    console.error("Failed to start load test:", error);

    await TestRun.findByIdAndUpdate(testRunId, {
      status: "FAILED",
      error: error.message,
    });
  }
};
