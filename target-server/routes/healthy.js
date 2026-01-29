import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  req.logger.info({
    message: "Healthy endpoint hit",
    status: 200,
  });

  res.status(200).json({
    status: "OK",
    message: "Server is healthy",
  });
});

export default router;
