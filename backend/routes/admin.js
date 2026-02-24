import express from "express";
import supabase from "../supabase.js";
import { requireAdminUser } from "../lib/auth.js";
import {
  assertServiceRoleKey,
  insertCommand,
} from "../lib/supabaseOps.js";

const router = express.Router();

const ACTIVE_SESSION_STATUSES = new Set(["ACTIVE", "IN_PROGRESS"]);
const SUCCESS_PAYMENT_STATUSES = new Set(["SUCCESS", "PAID", "CAPTURED"]);
const ONLINE_DEVICE_STATUSES = new Set(["ONLINE", "ACTIVE", "CONNECTED"]);
const DEVICE_ONLINE_WINDOW_MS = Number.parseInt(
  process.env.DEVICE_ONLINE_WINDOW_MS || "180000",
  10
);

function normalizeStatus(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().toUpperCase();
}

function isSessionActive(status) {
  return ACTIVE_SESSION_STATUSES.has(normalizeStatus(status));
}

function isSuccessfulPayment(status) {
  return SUCCESS_PAYMENT_STATUSES.has(normalizeStatus(status));
}

function startOfTodayIso() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

function startOfMonthIso() {
  const now = new Date();
  now.setDate(1);
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

function safeString(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

function parseMoney(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function buildUserLabel(profileById, userId) {
  const profile = profileById.get(userId);
  if (!profile) {
    return "Unknown user";
  }
  return profile.full_name || profile.email || "Unknown user";
}

function isDeviceOnline(deviceRow) {
  const normalizedStatus = normalizeStatus(deviceRow.status);
  if (ONLINE_DEVICE_STATUSES.has(normalizedStatus)) {
    return true;
  }

  if (!deviceRow.last_seen) {
    return false;
  }

  const lastSeenMs = new Date(deviceRow.last_seen).getTime();
  if (Number.isNaN(lastSeenMs)) {
    return false;
  }

  return Date.now() - lastSeenMs <= DEVICE_ONLINE_WINDOW_MS;
}

async function ensureAdmin(req, res) {
  assertServiceRoleKey();
  return requireAdminUser(req, res);
}

router.get("/me", async (req, res) => {
  try {
    const adminContext = await ensureAdmin(req, res);
    if (!adminContext) {
      return;
    }

    return res.json({
      user: {
        id: adminContext.user.id,
        email: adminContext.user.email || null,
      },
      profile: adminContext.profile
        ? {
            id: adminContext.profile.id,
            full_name: adminContext.profile.full_name || null,
            email: adminContext.profile.email || null,
          }
        : null,
      admin: true,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to validate admin access.",
    });
  }
});

router.get("/overview", async (req, res) => {
  try {
    const adminContext = await ensureAdmin(req, res);
    if (!adminContext) {
      return;
    }

    const monthStartIso = startOfMonthIso();
    const todayStartIso = startOfTodayIso();

    const [totalSlotsResult, activeSlotsResult, activeSessionsResult, devicesResult, paymentsResult] =
      await Promise.all([
        supabase.from("parking_slots").select("id", { count: "exact", head: true }),
        supabase
          .from("parking_slots")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true),
        supabase
          .from("parking_sessions")
          .select("id", { count: "exact", head: true })
          .in("status", [...ACTIVE_SESSION_STATUSES]),
        supabase.from("devices").select("id, status, last_seen"),
        supabase
          .from("payments")
          .select("amount, status, created_at")
          .gte("created_at", monthStartIso),
      ]);

    if (totalSlotsResult.error) {
      return res.status(500).json({ error: totalSlotsResult.error.message });
    }
    if (activeSlotsResult.error) {
      return res.status(500).json({ error: activeSlotsResult.error.message });
    }
    if (activeSessionsResult.error) {
      return res.status(500).json({ error: activeSessionsResult.error.message });
    }
    if (devicesResult.error) {
      return res.status(500).json({ error: devicesResult.error.message });
    }
    if (paymentsResult.error) {
      return res.status(500).json({ error: paymentsResult.error.message });
    }

    const deviceRows = devicesResult.data ?? [];
    const onlineCount = deviceRows.filter(isDeviceOnline).length;
    const offlineCount = Math.max(0, deviceRows.length - onlineCount);

    const monthlyPayments = paymentsResult.data ?? [];
    let todayRevenue = 0;
    let monthRevenue = 0;

    for (const payment of monthlyPayments) {
      if (!isSuccessfulPayment(payment.status)) {
        continue;
      }

      const amount = parseMoney(payment.amount);
      monthRevenue += amount;

      if (payment.created_at && payment.created_at >= todayStartIso) {
        todayRevenue += amount;
      }
    }

    return res.json({
      metrics: {
        total_slots: totalSlotsResult.count ?? 0,
        active_slots: activeSlotsResult.count ?? 0,
        active_sessions: activeSessionsResult.count ?? 0,
        today_revenue: todayRevenue,
        month_revenue: monthRevenue,
        devices_online: onlineCount,
        devices_offline: offlineCount,
      },
      generated_at: new Date().toISOString(),
      admin_user_id: adminContext.user.id,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch overview.",
    });
  }
});

router.get("/slots", async (req, res) => {
  try {
    const adminContext = await ensureAdmin(req, res);
    if (!adminContext) {
      return;
    }

    const [slotResult, deviceResult, sessionResult, profileResult] = await Promise.all([
      supabase
        .from("parking_slots")
        .select("id, device_id, slot_name, price, is_active, device_ref, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("devices").select("id, device_id, status, last_seen"),
      supabase
        .from("parking_sessions")
        .select("id, slot_id, status, user_id, created_at")
        .in("status", [...ACTIVE_SESSION_STATUSES]),
      supabase.from("profiles").select("id, full_name, email"),
    ]);

    if (slotResult.error) {
      return res.status(500).json({ error: slotResult.error.message });
    }
    if (deviceResult.error) {
      return res.status(500).json({ error: deviceResult.error.message });
    }
    if (sessionResult.error) {
      return res.status(500).json({ error: sessionResult.error.message });
    }
    if (profileResult.error) {
      return res.status(500).json({ error: profileResult.error.message });
    }

    const deviceByDeviceId = new Map((deviceResult.data ?? []).map((row) => [row.device_id, row]));
    const deviceByRef = new Map((deviceResult.data ?? []).map((row) => [row.id, row]));
    const activeSessionBySlotId = new Map((sessionResult.data ?? []).map((row) => [row.slot_id, row]));
    const profileById = new Map((profileResult.data ?? []).map((row) => [row.id, row]));

    const slots = (slotResult.data ?? []).map((slot) => {
      const device =
        (slot.device_ref ? deviceByRef.get(slot.device_ref) : null) ||
        (slot.device_id ? deviceByDeviceId.get(slot.device_id) : null) ||
        null;
      const activeSession = activeSessionBySlotId.get(slot.id) || null;

      let liveStatus = "INACTIVE";
      if (slot.is_active) {
        liveStatus = activeSession ? "OCCUPIED" : "AVAILABLE";
      }

      return {
        ...slot,
        live_status: liveStatus,
        device_status: device?.status ?? null,
        device_last_seen: device?.last_seen ?? null,
        device_online: device ? isDeviceOnline(device) : false,
        active_session_id: activeSession?.id ?? null,
        active_user_id: activeSession?.user_id ?? null,
        active_user_name: activeSession ? buildUserLabel(profileById, activeSession.user_id) : null,
      };
    });

    return res.json({ slots });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch slots.",
    });
  }
});

router.post("/slots", async (req, res) => {
  try {
    const adminContext = await ensureAdmin(req, res);
    if (!adminContext) {
      return;
    }

    const slotName = safeString(req.body?.slot_name);
    const deviceId = safeString(req.body?.device_id);
    const price = Number(req.body?.price);
    const isActive = req.body?.is_active ?? true;

    if (!slotName) {
      return res.status(400).json({ error: "slot_name is required." });
    }
    if (!deviceId) {
      return res.status(400).json({ error: "device_id is required." });
    }
    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({ error: "price must be a non-negative number." });
    }

    const { data: device, error: deviceError } = await supabase
      .from("devices")
      .select("id, device_id")
      .eq("device_id", deviceId)
      .maybeSingle();

    if (deviceError) {
      return res.status(500).json({ error: deviceError.message });
    }
    if (!device) {
      return res.status(400).json({
        error: `Device ${deviceId} not found. Create device row first.`,
      });
    }

    const { data: slot, error: insertError } = await supabase
      .from("parking_slots")
      .insert({
        slot_name: slotName,
        device_id: deviceId,
        device_ref: device.id,
        price,
        is_active: Boolean(isActive),
      })
      .select("id, slot_name, device_id, device_ref, price, is_active, created_at")
      .single();

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }

    return res.status(201).json({ slot });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to create slot.",
    });
  }
});

router.patch("/slots/:slotId", async (req, res) => {
  try {
    const adminContext = await ensureAdmin(req, res);
    if (!adminContext) {
      return;
    }

    const slotId = safeString(req.params?.slotId);
    if (!slotId) {
      return res.status(400).json({ error: "slotId is required." });
    }

    const payload = {};

    const slotName = safeString(req.body?.slot_name);
    if (slotName) {
      payload.slot_name = slotName;
    }

    if (req.body?.price !== undefined) {
      const price = Number(req.body.price);
      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({ error: "price must be a non-negative number." });
      }
      payload.price = price;
    }

    if (req.body?.is_active !== undefined) {
      payload.is_active = Boolean(req.body.is_active);
    }

    if (req.body?.device_id !== undefined) {
      const deviceId = safeString(req.body.device_id);
      if (!deviceId) {
        return res.status(400).json({ error: "device_id cannot be empty." });
      }

      const { data: device, error: deviceError } = await supabase
        .from("devices")
        .select("id, device_id")
        .eq("device_id", deviceId)
        .maybeSingle();

      if (deviceError) {
        return res.status(500).json({ error: deviceError.message });
      }
      if (!device) {
        return res.status(400).json({
          error: `Device ${deviceId} not found.`,
        });
      }

      payload.device_id = deviceId;
      payload.device_ref = device.id;
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: "No valid update fields provided." });
    }

    const { data: slot, error: updateError } = await supabase
      .from("parking_slots")
      .update(payload)
      .eq("id", slotId)
      .select("id, slot_name, device_id, device_ref, price, is_active, created_at")
      .maybeSingle();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }
    if (!slot) {
      return res.status(404).json({ error: "Slot not found." });
    }

    return res.json({ slot });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to update slot.",
    });
  }
});

router.get("/devices", async (req, res) => {
  try {
    const adminContext = await ensureAdmin(req, res);
    if (!adminContext) {
      return;
    }

    const [deviceResult, commandResult] = await Promise.all([
      supabase
        .from("devices")
        .select("id, device_id, status, last_seen, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("commands")
        .select("id, device_id, device_ref, command, executed, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    if (deviceResult.error) {
      return res.status(500).json({ error: deviceResult.error.message });
    }
    if (commandResult.error) {
      return res.status(500).json({ error: commandResult.error.message });
    }

    const commandRows = commandResult.data ?? [];
    const devices = (deviceResult.data ?? []).map((device) => {
      const relatedCommands = commandRows.filter(
        (command) => command.device_id === device.device_id || command.device_ref === device.id
      );
      const latestCommand = relatedCommands[0] ?? null;
      const pendingCommandCount = relatedCommands.filter((command) => command.executed === false).length;

      return {
        ...device,
        online: isDeviceOnline(device),
        pending_command_count: pendingCommandCount,
        latest_command: latestCommand,
        error_log_count: relatedCommands.filter((command) =>
          normalizeStatus(command.command).includes("ERROR")
        ).length,
        tamper_alert_count: relatedCommands.filter((command) =>
          normalizeStatus(command.command).includes("TAMPER")
        ).length,
      };
    });

    return res.json({ devices });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch devices.",
    });
  }
});

router.post("/devices/:deviceId/open", async (req, res) => {
  try {
    const adminContext = await ensureAdmin(req, res);
    if (!adminContext) {
      return;
    }

    const deviceId = safeString(req.params?.deviceId);
    if (!deviceId) {
      return res.status(400).json({ error: "deviceId is required." });
    }

    await insertCommand("OPEN", deviceId);
    return res.json({ message: "OPEN command queued.", device_id: deviceId });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to queue OPEN command.",
    });
  }
});

router.post("/devices/:deviceId/close", async (req, res) => {
  try {
    const adminContext = await ensureAdmin(req, res);
    if (!adminContext) {
      return;
    }

    const deviceId = safeString(req.params?.deviceId);
    if (!deviceId) {
      return res.status(400).json({ error: "deviceId is required." });
    }

    await insertCommand("CLOSE", deviceId);
    return res.json({ message: "CLOSE command queued.", device_id: deviceId });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to queue CLOSE command.",
    });
  }
});

router.get("/bookings", async (req, res) => {
  try {
    const adminContext = await ensureAdmin(req, res);
    if (!adminContext) {
      return;
    }

    const [bookingResult, profileResult, slotResult] = await Promise.all([
      supabase
        .from("bookings")
        .select("id, user_id, device_id, amount, status, created_at")
        .order("created_at", { ascending: false })
        .limit(250),
      supabase.from("profiles").select("id, full_name, email"),
      supabase.from("parking_slots").select("id, slot_name, device_id"),
    ]);

    if (bookingResult.error) {
      return res.status(500).json({ error: bookingResult.error.message });
    }
    if (profileResult.error) {
      return res.status(500).json({ error: profileResult.error.message });
    }
    if (slotResult.error) {
      return res.status(500).json({ error: slotResult.error.message });
    }

    const profileById = new Map((profileResult.data ?? []).map((row) => [row.id, row]));
    const firstSlotByDeviceId = new Map();
    for (const slot of slotResult.data ?? []) {
      if (slot.device_id && !firstSlotByDeviceId.has(slot.device_id)) {
        firstSlotByDeviceId.set(slot.device_id, slot);
      }
    }

    const bookings = (bookingResult.data ?? []).map((booking) => {
      const slot = booking.device_id ? firstSlotByDeviceId.get(booking.device_id) : null;
      const normalizedBookingStatus = normalizeStatus(booking.status);
      const paymentStatus =
        normalizedBookingStatus === "PAID" || normalizedBookingStatus === "COMPLETED"
          ? "PAID"
          : normalizedBookingStatus === "PENDING_PAYMENT"
            ? "PENDING"
            : normalizedBookingStatus === "CANCELLED"
              ? "CANCELLED"
              : "UNKNOWN";

      return {
        ...booking,
        user_name: buildUserLabel(profileById, booking.user_id),
        slot_name: slot?.slot_name ?? null,
        payment_status: paymentStatus,
      };
    });

    return res.json({ bookings });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch bookings.",
    });
  }
});

router.patch("/bookings/:bookingId/status", async (req, res) => {
  try {
    const adminContext = await ensureAdmin(req, res);
    if (!adminContext) {
      return;
    }

    const bookingId = safeString(req.params?.bookingId);
    const nextStatus = normalizeStatus(req.body?.status);

    if (!bookingId) {
      return res.status(400).json({ error: "bookingId is required." });
    }
    if (!nextStatus) {
      return res.status(400).json({ error: "status is required." });
    }

    const allowedStatuses = new Set([
      "PENDING_PAYMENT",
      "PAID",
      "COMPLETED",
      "CANCELLED",
    ]);
    if (!allowedStatuses.has(nextStatus)) {
      return res.status(400).json({ error: "Unsupported booking status." });
    }

    const { data: booking, error: updateError } = await supabase
      .from("bookings")
      .update({ status: nextStatus })
      .eq("id", bookingId)
      .select("id, user_id, device_id, amount, status, created_at")
      .maybeSingle();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }
    if (!booking) {
      return res.status(404).json({ error: "Booking not found." });
    }

    return res.json({ booking });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to update booking.",
    });
  }
});

router.get("/sessions", async (req, res) => {
  try {
    const adminContext = await ensureAdmin(req, res);
    if (!adminContext) {
      return;
    }

    const [sessionResult, profileResult, slotResult] = await Promise.all([
      supabase
        .from("parking_sessions")
        .select("id, user_id, slot_id, device_id, status, entry_expiry, created_at, device_ref")
        .order("created_at", { ascending: false })
        .limit(300),
      supabase.from("profiles").select("id, full_name, email"),
      supabase.from("parking_slots").select("id, slot_name, device_id"),
    ]);

    if (sessionResult.error) {
      return res.status(500).json({ error: sessionResult.error.message });
    }
    if (profileResult.error) {
      return res.status(500).json({ error: profileResult.error.message });
    }
    if (slotResult.error) {
      return res.status(500).json({ error: slotResult.error.message });
    }

    const profileById = new Map((profileResult.data ?? []).map((row) => [row.id, row]));
    const slotById = new Map((slotResult.data ?? []).map((row) => [row.id, row]));

    const sessions = (sessionResult.data ?? []).map((session) => {
      const slot = session.slot_id ? slotById.get(session.slot_id) : null;
      const expiryMs = session.entry_expiry ? new Date(session.entry_expiry).getTime() : NaN;
      const remainingSeconds =
        isSessionActive(session.status) && Number.isFinite(expiryMs)
          ? Math.max(0, Math.floor((expiryMs - Date.now()) / 1000))
          : 0;

      return {
        ...session,
        user_name: buildUserLabel(profileById, session.user_id),
        slot_name: slot?.slot_name ?? null,
        remaining_seconds: remainingSeconds,
      };
    });

    return res.json({ sessions });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch sessions.",
    });
  }
});

router.post("/sessions/:sessionId/force-close", async (req, res) => {
  try {
    const adminContext = await ensureAdmin(req, res);
    if (!adminContext) {
      return;
    }

    const sessionId = safeString(req.params?.sessionId);
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId is required." });
    }

    const { data: currentSession, error: sessionError } = await supabase
      .from("parking_sessions")
      .select("id, device_id, status")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError) {
      return res.status(500).json({ error: sessionError.message });
    }
    if (!currentSession) {
      return res.status(404).json({ error: "Session not found." });
    }

    const { data: updatedSession, error: updateError } = await supabase
      .from("parking_sessions")
      .update({ status: "COMPLETED" })
      .eq("id", sessionId)
      .select("id, user_id, slot_id, device_id, status, entry_expiry, created_at, device_ref")
      .maybeSingle();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    if (currentSession.device_id) {
      await insertCommand("CLOSE", currentSession.device_id);
    }

    return res.json({
      message: "Session force-closed.",
      session: updatedSession,
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to force close session.",
    });
  }
});

export default router;
