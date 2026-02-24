import supabase from "../supabase.js";

const DEFAULT_DEVICE_ID = process.env.DEFAULT_DEVICE_ID || "GATE_001";

function decodeJwtPayload(token) {
  if (!token) {
    return null;
  }

  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

export function assertServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.SUPABASE_URL;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend env.");
  }

  const role = decodeJwtPayload(key)?.role;
  if (role === "anon") {
    throw new Error(
      "Backend is using an anon key. Set SUPABASE_SERVICE_ROLE_KEY to the service_role key."
    );
  }
}

async function maybeSelectSingle(query) {
  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new Error(error.message || "Supabase query failed.");
  }
  return data;
}

export async function getDeviceByDeviceId(deviceId = DEFAULT_DEVICE_ID) {
  assertServiceRoleKey();
  return maybeSelectSingle(
    supabase
      .from("devices")
      .select("id, device_id, status, last_seen, created_at")
      .eq("device_id", deviceId)
  );
}

export async function getDeviceRef(deviceId = DEFAULT_DEVICE_ID) {
  const device = await getDeviceByDeviceId(deviceId);
  return device?.id || null;
}

export async function getParkingSlotById(slotId) {
  assertServiceRoleKey();
  return maybeSelectSingle(
    supabase
      .from("parking_slots")
      .select("id, device_id, slot_name, price, is_active, device_ref, created_at")
      .eq("id", slotId)
  );
}

export async function getActiveSlot({
  slotId,
  deviceId = DEFAULT_DEVICE_ID,
  fallbackToAnyActive = true,
} = {}) {
  assertServiceRoleKey();

  if (slotId) {
    const slot = await getParkingSlotById(slotId);
    if (!slot) {
      return null;
    }
    if (slot.is_active === false) {
      throw new Error("Selected parking slot is inactive.");
    }
    return slot;
  }

  const slotForDevice = await maybeSelectSingle(
    supabase
      .from("parking_slots")
      .select("id, device_id, slot_name, price, is_active, device_ref, created_at")
      .eq("is_active", true)
      .eq("device_id", deviceId)
      .limit(1)
      .order("created_at", { ascending: false })
  );

  if (slotForDevice) {
    return slotForDevice;
  }

  if (!fallbackToAnyActive) {
    return null;
  }

  return maybeSelectSingle(
    supabase
      .from("parking_slots")
      .select("id, device_id, slot_name, price, is_active, device_ref, created_at")
      .eq("is_active", true)
      .limit(1)
      .order("created_at", { ascending: false })
  );
}

export async function insertCommand(commandType, deviceId = DEFAULT_DEVICE_ID) {
  assertServiceRoleKey();

  const primaryInsert = await supabase.from("commands").insert({
    device_id: deviceId,
    command: commandType,
    executed: false,
  });

  if (!primaryInsert.error) {
    return;
  }

  const deviceRef = await getDeviceRef(deviceId);
  if (!deviceRef) {
    throw new Error(primaryInsert.error.message || "Command insert failed.");
  }

  const fallbackInsert = await supabase.from("commands").insert({
    device_ref: deviceRef,
    command: commandType,
    executed: false,
  });

  if (fallbackInsert.error) {
    throw new Error(fallbackInsert.error.message || "Command insert failed.");
  }
}

export async function insertPayment({
  userId,
  sessionId,
  amount,
  status = "SUCCESS",
  orderId,
  paymentId,
}) {
  assertServiceRoleKey();
  const payload = {
    user_id: userId,
    session_id: sessionId,
    amount,
    status,
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
  };

  const { data, error } = await supabase
    .from("payments")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message || "Payment insert failed.");
  }

  return data;
}

export async function listActiveSlots() {
  assertServiceRoleKey();

  const { data: slots, error: slotError } = await supabase
    .from("parking_slots")
    .select("id, device_id, slot_name, price, is_active, device_ref, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (slotError) {
    throw new Error(slotError.message || "Unable to list parking slots.");
  }

  const slotRows = slots ?? [];
  if (slotRows.length === 0) {
    return [];
  }

  const deviceIds = [...new Set(slotRows.map((row) => row.device_id).filter(Boolean))];
  const deviceRefs = [...new Set(slotRows.map((row) => row.device_ref).filter(Boolean))];

  let deviceRows = [];
  if (deviceIds.length > 0 || deviceRefs.length > 0) {
    let query = supabase
      .from("devices")
      .select("id, device_id, status, last_seen, created_at")
      .limit(500);

    if (deviceIds.length > 0) {
      query = query.in("device_id", deviceIds);
    } else if (deviceRefs.length > 0) {
      query = query.in("id", deviceRefs);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message || "Unable to load devices for slots.");
    }
    deviceRows = data ?? [];
  }

  const byDeviceId = new Map(deviceRows.map((row) => [row.device_id, row]));
  const byDeviceRef = new Map(deviceRows.map((row) => [row.id, row]));

  return slotRows.map((slot) => {
    const device =
      (slot.device_ref ? byDeviceRef.get(slot.device_ref) : null) ||
      byDeviceId.get(slot.device_id) ||
      null;

    return {
      ...slot,
      device_status: device?.status ?? null,
      device_last_seen: device?.last_seen ?? null,
    };
  });
}

export { DEFAULT_DEVICE_ID };
