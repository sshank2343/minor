import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import { Server } from "socket.io";

import connectDB from "./config/db.js";
import { connectRedis } from "./config/redis.js";
import apiRoutes from "./routes/api.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.set("io", io);

app.use(cors());
app.use(express.json());

app.use("/api", apiRoutes);

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.CONTROL_PLANE_PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await connectRedis();

    server.listen(PORT, () => {
      console.log(`Control Plane running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start Control Plane:", error);
    process.exit(1);
  }
};

startServer();
