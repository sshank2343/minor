import { getRedisClient } from "../config/redis.js";

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

  await subscriber.subscribe("telemetry", (message) => {
    try {
      const data = JSON.parse(message);

      if (io) {
        io.emit("telemetry", data);
      }
    } catch (err) {
      console.error("Telemetry parse error:", err);
    }
  });

  console.log("Telemetry service listening on Redis channel: telemetry");
};
