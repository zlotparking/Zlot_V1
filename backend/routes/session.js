import express from "express";
import supabase from "../supabase.js";
import {
  assertServiceRoleKey,
  DEFAULT_DEVICE_ID,
  getActiveSlot,
  insertCommand,
} from "../lib/supabaseOps.js";
import { requireAuthenticatedUser } from "../lib/auth.js";

const router = express.Router();
const SESSION_DURATION_MS = Number.parseInt(
  process.env.SESSION_DURATION_MS || "30000",
  10
);

router.post("/start", async (req, res) => {
  try {
    assertServiceRoleKey();

    const authUser = await requireAuthenticatedUser(req, res);
    if (!authUser) {
      return;
    }

    const requestedUserId = String(req.body?.user_id || "").trim();
    if (requestedUserId && requestedUserId !== authUser.id) {
      return res.status(403).json({ error: "user_id does not match authenticated user." });
    }

    const userId = authUser.id;
    const slotId = String(req.body?.slot_id || "").trim();

    const { data: activeSessions, error: activeError } = await supabase
      .from("parking_sessions")
      .select("id")
      .eq("user_id", userId)
      .in("status", ["ACTIVE", "IN_PROGRESS"]);

    if (activeError) {
      return res.status(500).json({ error: activeError.message });
    }

    if ((activeSessions || []).length > 0) {
      return res.status(400).json({
        error: "User already has an active parking session",
      });
    }

    const slot = await getActiveSlot({
      slotId: slotId || undefined,
      deviceId: DEFAULT_DEVICE_ID,
      fallbackToAnyActive: true,
    });

    if (!slot) {
      return res.status(400).json({
        error: "No active parking slot is available. Add an active row in parking_slots.",
      });
    }

    const expiryIso = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
    const sessionPayload = {
      user_id: userId,
      slot_id: slot.id,
      device_id: slot.device_id || DEFAULT_DEVICE_ID,
      status: "ACTIVE",
      entry_expiry: expiryIso,
      ...(slot.device_ref ? { device_ref: slot.device_ref } : {}),
    };

    const { data: session, error: sessionError } = await supabase
      .from("parking_sessions")
      .insert(sessionPayload)
      .select("*")
      .single();

    if (sessionError || !session) {
      return res.status(502).json({
        error: sessionError?.message || "Parking session was not created.",
      });
    }

    await insertCommand("OPEN", session.device_id || DEFAULT_DEVICE_ID);

    setTimeout(async () => {
      try {
        await insertCommand("CLOSE", session.device_id || DEFAULT_DEVICE_ID);
        await supabase
          .from("parking_sessions")
          .update({ status: "COMPLETED" })
          .eq("id", session.id);
      } catch (error) {
        console.error("Failed to auto-complete session:", error);
      }
    }, SESSION_DURATION_MS);

    return res.json({ message: "Session started", session, slot });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to start session",
    });
  }
});

export default router;
