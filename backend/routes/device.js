import express from "express";
import supabase from "../supabase.js";
import { assertServiceRoleKey } from "../lib/supabaseOps.js";

const router = express.Router();

router.post("/poll", async (req, res) => {
  try {
    assertServiceRoleKey();

    const { device_id } = req.body;

    if (!device_id) {
      return res.status(400).json({ error: "device_id required" });
    }

    // Find device UUID
    const { data: device, error: deviceError } = await supabase
      .from("devices")
      .select("id")
      .eq("device_id", device_id)
      .single();

    if (deviceError || !device) {
      return res.status(404).json({ error: "Device not found" });
    }

    await supabase
      .from("devices")
      .update({ status: "ONLINE", last_seen: new Date().toISOString() })
      .eq("id", device.id);

    // Prefer foreign-key style lookup (device_ref), then fallback to device_id.
    const { data: commandByRef } = await supabase
      .from("commands")
      .select("*")
      .eq("device_ref", device.id)
      .eq("executed", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (commandByRef) {
      return res.json(commandByRef);
    }

    const { data: commandByDeviceId, error: commandByDeviceIdError } =
      await supabase
        .from("commands")
        .select("*")
        .eq("device_id", device_id)
        .eq("executed", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    if (commandByDeviceIdError || !commandByDeviceId) {
      return res.json({});
    }

    return res.json(commandByDeviceId);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/ack", async (req, res) => {
  try {
    assertServiceRoleKey();

    const commandId = String(req.body?.command_id || "").trim();
    if (!commandId) {
      return res.status(400).json({ error: "command_id required" });
    }

    const { data: command, error: commandError } = await supabase
      .from("commands")
      .select("id, device_id, device_ref, executed")
      .eq("id", commandId)
      .maybeSingle();

    if (commandError) {
      return res.status(500).json({ error: commandError.message });
    }

    if (!command) {
      return res.status(404).json({ error: "Command not found" });
    }

    const { error: updateCommandError } = await supabase
      .from("commands")
      .update({ executed: true })
      .eq("id", commandId);

    if (updateCommandError) {
      return res.status(500).json({ error: updateCommandError.message });
    }

    const heartbeatPayload = {
      status: "ONLINE",
      last_seen: new Date().toISOString(),
    };

    if (command.device_ref) {
      await supabase.from("devices").update(heartbeatPayload).eq("id", command.device_ref);
    } else if (command.device_id) {
      await supabase
        .from("devices")
        .update(heartbeatPayload)
        .eq("device_id", command.device_id);
    }

    return res.json({ message: "Command acknowledged", command_id: commandId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
