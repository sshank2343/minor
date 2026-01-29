import TestRun from "../models/TestRun.js";

export const startTest = async (req, res) => {
  try {
    const { targetUrl, users, spawnRate, duration } = req.body;

    if (!targetUrl || !users || !spawnRate || !duration) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const testRun = await TestRun.create({
      targetUrl,
      users,
      spawnRate,
      duration,
      status: "CREATED",
    });

    return res.status(201).json({
      message: "Test created",
      testRun,
    });
  } catch (error) {
    console.error("Start test error:", error);
    return res.status(500).json({ message: "Failed to start test" });
  }
};

export const stopTest = async (req, res) => {
  try {
    const { id } = req.params;

    const testRun = await TestRun.findById(id);

    if (!testRun) {
      return res.status(404).json({ message: "Test not found" });
    }

    testRun.status = "STOPPED";
    testRun.finishedAt = new Date();
    await testRun.save();

    return res.json({
      message: "Test stopped",
      testRun,
    });
  } catch (error) {
    console.error("Stop test error:", error);
    return res.status(500).json({ message: "Failed to stop test" });
  }
};
