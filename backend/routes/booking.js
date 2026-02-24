import express from "express";
import supabase from "../supabase.js";
import {
  assertServiceRoleKey,
  DEFAULT_DEVICE_ID,
  getActiveSlot,
  insertCommand,
  insertPayment,
  listActiveSlots,
} from "../lib/supabaseOps.js";
import { requireAuthenticatedUser } from "../lib/auth.js";

const router = express.Router();

const SESSION_DURATION_MS = Number.parseInt(
  process.env.SESSION_DURATION_MS || "30000",
  10
);

router.get("/slots", async (_req, res) => {
  try {
    const slots = await listActiveSlots();
    return res.json({ slots });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch parking slots.",
    });
  }
});

router.get("/history", async (req, res) => {
  try {
    assertServiceRoleKey();

    const authUser = await requireAuthenticatedUser(req, res);
    if (!authUser) {
      return;
    }

    const [bookingResult, sessionResult, paymentResult] = await Promise.all([
      supabase
        .from("bookings")
        .select("id, user_id, device_id, amount, status, created_at")
        .eq("user_id", authUser.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("parking_sessions")
        .select("id, user_id, slot_id, device_id, status, entry_expiry, created_at, device_ref")
        .eq("user_id", authUser.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("payments")
        .select("id, user_id, session_id, amount, status, razorpay_order_id, razorpay_payment_id, created_at")
        .eq("user_id", authUser.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    if (bookingResult.error) {
      return res.status(500).json({ error: bookingResult.error.message });
    }
    if (sessionResult.error) {
      return res.status(500).json({ error: sessionResult.error.message });
    }
    if (paymentResult.error) {
      return res.status(500).json({ error: paymentResult.error.message });
    }

    const sessions = sessionResult.data ?? [];
    const slotIds = [...new Set(sessions.map((row) => row.slot_id).filter(Boolean))];

    let slots = [];
    if (slotIds.length > 0) {
      const { data, error } = await supabase
        .from("parking_slots")
        .select("id, slot_name, device_id")
        .in("id", slotIds);

      if (error) {
        return res.status(500).json({ error: error.message });
      }
      slots = data ?? [];
    }

    return res.json({
      bookings: bookingResult.data ?? [],
      sessions,
      payments: paymentResult.data ?? [],
      slots,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch dashboard history.",
    });
  }
});

router.post("/create", async (req, res) => {
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
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();

    const { error: expireSessionError } = await supabase
      .from("parking_sessions")
      .update({ status: "COMPLETED" })
      .eq("user_id", userId)
      .in("status", ["ACTIVE", "IN_PROGRESS"])
      .lt("entry_expiry", nowIso);

    if (expireSessionError) {
      return res.status(500).json({ error: expireSessionError.message });
    }

    const { data: activeSessions, error: activeSessionError } = await supabase
      .from("parking_sessions")
      .select("id, entry_expiry")
      .eq("user_id", userId)
      .in("status", ["ACTIVE", "IN_PROGRESS"])
      .order("created_at", { ascending: false })
      .limit(10);

    if (activeSessionError) {
      return res.status(500).json({ error: activeSessionError.message });
    }

    const firstLiveSession = (activeSessions || []).find((session) => {
      if (!session.entry_expiry) {
        return true;
      }

      const expiryMs = Date.parse(session.entry_expiry);
      if (!Number.isFinite(expiryMs)) {
        return true;
      }

      return expiryMs > nowMs;
    });

    if (firstLiveSession) {
      return res.status(409).json({
        error: "User already has an active parking session.",
        active_session_id: firstLiveSession.id,
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

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        user_id: userId,
        device_id: slot.device_id || DEFAULT_DEVICE_ID,
        amount: Number(slot.price || 0),
        status: "PENDING_PAYMENT",
      })
      .select("*")
      .single();

    if (bookingError || !booking) {
      return res.status(502).json({
        error: bookingError?.message || "Booking was not created by Supabase.",
      });
    }

    return res.status(201).json({ booking, slot });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Booking creation failed",
    });
  }
});

router.post("/pay", async (req, res) => {
  try {
    assertServiceRoleKey();

    const authUser = await requireAuthenticatedUser(req, res);
    if (!authUser) {
      return;
    }

    const bookingId = String(req.body?.booking_id || "").trim();
    const requestedSlotId = String(req.body?.slot_id || "").trim();

    if (!bookingId) {
      return res.status(400).json({ error: "booking_id is required" });
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .eq("user_id", authUser.id)
      .maybeSingle();

    if (bookingError) {
      return res.status(500).json({ error: bookingError.message });
    }

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const bookingStatus = (booking.status || "").toUpperCase();
    if (bookingStatus === "PAID" || bookingStatus === "COMPLETED") {
      return res.status(409).json({
        error: "Booking is already paid.",
      });
    }
    if (bookingStatus === "CANCELLED") {
      return res.status(400).json({
        error: "Cancelled booking cannot be paid.",
      });
    }

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();

    const { error: expireSessionError } = await supabase
      .from("parking_sessions")
      .update({ status: "COMPLETED" })
      .eq("user_id", authUser.id)
      .in("status", ["ACTIVE", "IN_PROGRESS"])
      .lt("entry_expiry", nowIso);

    if (expireSessionError) {
      return res.status(500).json({ error: expireSessionError.message });
    }

    const { data: activeSessions, error: activeSessionError } = await supabase
      .from("parking_sessions")
      .select("id, entry_expiry")
      .eq("user_id", authUser.id)
      .in("status", ["ACTIVE", "IN_PROGRESS"])
      .order("created_at", { ascending: false })
      .limit(10);

    if (activeSessionError) {
      return res.status(500).json({ error: activeSessionError.message });
    }

    const firstLiveSession = (activeSessions || []).find((session) => {
      if (!session.entry_expiry) {
        return true;
      }

      const expiryMs = Date.parse(session.entry_expiry);
      if (!Number.isFinite(expiryMs)) {
        return true;
      }

      return expiryMs > nowMs;
    });

    if (firstLiveSession) {
      return res.status(409).json({
        error: "User already has an active parking session.",
        active_session_id: firstLiveSession.id,
      });
    }

    const slot = await getActiveSlot({
      slotId: requestedSlotId || undefined,
      deviceId: booking.device_id || DEFAULT_DEVICE_ID,
      fallbackToAnyActive: true,
    });

    if (!slot) {
      return res.status(400).json({
        error:
          "Unable to map booking to an active slot. Pass slot_id or configure parking_slots.",
      });
    }

    const expiryIso = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
    const sessionPayload = {
      user_id: booking.user_id,
      slot_id: slot.id,
      device_id: slot.device_id || booking.device_id || DEFAULT_DEVICE_ID,
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

    const payment = await insertPayment({
      userId: booking.user_id,
      sessionId: session.id,
      amount: Number(booking.amount || slot.price || 0),
      status: "SUCCESS",
      orderId: `order_${bookingId.slice(0, 8)}`,
      paymentId: `pay_${Date.now()}`,
    });

    const { error: bookingPatchError } = await supabase
      .from("bookings")
      .update({ status: "PAID" })
      .eq("id", bookingId);

    if (bookingPatchError) {
      return res.status(500).json({ error: bookingPatchError.message });
    }

    await insertCommand("OPEN", session.device_id || DEFAULT_DEVICE_ID);

    setTimeout(async () => {
      try {
        await insertCommand("CLOSE", session.device_id || DEFAULT_DEVICE_ID);
        await supabase
          .from("parking_sessions")
          .update({ status: "COMPLETED" })
          .eq("id", session.id);
      } catch (timeoutError) {
        console.error("Failed to auto-complete session:", timeoutError);
      }
    }, SESSION_DURATION_MS);

    return res.json({
      message: "Payment confirmed, gate opening",
      session,
      payment,
      slot,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Payment handling failed",
    });
  }
});

export default router;
