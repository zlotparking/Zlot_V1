import express from "express";
import {
  assertServiceRoleKey,
  DEFAULT_DEVICE_ID,
  insertCommand,
} from "../lib/supabaseOps.js";

const router = express.Router();
const SESSION_DURATION_MS = Number.parseInt(
  process.env.SESSION_DURATION_MS || "30000",
  10
);

router.post("/open", async (req, res) => {
  try {
    assertServiceRoleKey();

    const deviceId = String(req.body?.device_id || DEFAULT_DEVICE_ID).trim();
    await insertCommand("OPEN", deviceId);

    setTimeout(async () => {
      try {
        await insertCommand("CLOSE", deviceId);
      } catch (error) {
        console.error("Failed to auto-close gate:", error);
      }
    }, SESSION_DURATION_MS);

    return res.json({ message: "Gate open command sent", device_id: deviceId });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to open gate",
    });
  }
});

router.post("/close", async (req, res) => {
  try {
    assertServiceRoleKey();

    const deviceId = String(req.body?.device_id || DEFAULT_DEVICE_ID).trim();
    await insertCommand("CLOSE", deviceId);
    return res.json({ message: "Gate close command sent", device_id: deviceId });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to close gate",
    });
  }
});

export default router;
