import express from "express";
import winston from "winston";
import routes from "./routes/index.js";

const app = express();
const PORT = process.env.TARGET_PORT || 3000;

// Winston logger (JSON logs for AI agent)
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.File({
      filename: "/shared/logs/victim.json",
    }),
  ],
});

app.use(express.json());

// Attach logger to request
app.use((req, res, next) => {
  req.logger = logger;
  next();
});

app.use("/", routes);

app.listen(PORT, () => {
  logger.info({
    message: "Target server started",
    port: PORT,
  });
});
