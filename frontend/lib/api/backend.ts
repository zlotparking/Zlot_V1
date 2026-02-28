const LOCAL_API_BASE_URL = "http://localhost:5000";

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

type BackendError = {
  error?: string;
  message?: string;
};

export type BackendParkingSlot = {
  id: string;
  device_id: string | null;
  slot_name: string | null;
  price: number | null;
  is_active: boolean | null;
  device_ref: string | null;
  created_at: string | null;
  device_status?: string | null;
  device_last_seen?: string | null;
};

export type BackendBooking = {
  id: string;
  user_id: string;
  device_id: string | null;
  amount: number | null;
  status: string | null;
  created_at?: string | null;
};

export type BackendSession = {
  id: string;
  user_id: string;
  slot_id: string | null;
  device_id: string | null;
  status: string | null;
  entry_expiry: string | null;
  created_at?: string | null;
  device_ref?: string | null;
};

export type BackendPayment = {
  id: string;
  user_id: string;
  session_id: string;
  amount: number | null;
  status: string | null;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  created_at?: string | null;
};

export type AdminOverviewMetrics = {
  total_slots: number;
  active_slots: number;
  active_sessions: number;
  today_revenue: number;
  month_revenue: number;
  devices_online: number;
  devices_offline: number;
};

export type AdminSlot = BackendParkingSlot & {
  live_status?: "AVAILABLE" | "OCCUPIED" | "INACTIVE";
  device_status?: string | null;
  device_last_seen?: string | null;
  device_online?: boolean;
  active_session_id?: string | null;
  active_user_id?: string | null;
  active_user_name?: string | null;
};

export type AdminDevice = {
  id: string;
  device_id: string;
  status: string | null;
  last_seen: string | null;
  created_at: string | null;
  online: boolean;
  pending_command_count: number;
  latest_command: {
    id: string;
    command: string | null;
    executed: boolean | null;
    created_at: string | null;
  } | null;
  error_log_count: number;
  tamper_alert_count: number;
};

export type AdminBooking = BackendBooking & {
  user_name?: string | null;
  slot_name?: string | null;
  payment_status?: string | null;
};

export type AdminSession = BackendSession & {
  user_name?: string | null;
  slot_name?: string | null;
  remaining_seconds?: number;
};

type SlotsResponse = {
  slots?: BackendParkingSlot[];
};

type BookingCreateResponse = {
  booking?: BackendBooking;
  slot?: BackendParkingSlot;
};

type BookingPayResponse = {
  message?: string;
  session?: BackendSession;
  payment?: BackendPayment;
  slot?: BackendParkingSlot;
};

type DashboardHistoryResponse = {
  bookings?: BackendBooking[];
  sessions?: BackendSession[];
  payments?: BackendPayment[];
  slots?: Pick<BackendParkingSlot, "id" | "slot_name" | "device_id">[];
};

type AdminMeResponse = {
  admin?: boolean;
  user?: {
    id: string;
    email?: string | null;
  };
};

type AdminOverviewResponse = {
  metrics?: AdminOverviewMetrics;
};

type AdminSlotsResponse = {
  slots?: AdminSlot[];
};

type AdminDevicesResponse = {
  devices?: AdminDevice[];
};

type AdminBookingsResponse = {
  bookings?: AdminBooking[];
};

type AdminSessionsResponse = {
  sessions?: AdminSession[];
};

export type OwnerSubmissionPayload = {
  owner_name: string;
  phone: string;
  email: string;
  slot_name: string;
  location: string;
  price_per_hour: number;
  maps_link?: string;
  availability?: string;
  notes?: string;
  image_names: string[];
  video_name?: string | null;
  image_links?: Array<{
    name: string;
    url: string;
  }>;
  video_link?: {
    name: string;
    url: string;
  } | null;
  images_base64?: Array<{
    name: string;
    content_type: string;
    data_base64: string;
  }>;
  video_base64?: {
    name: string;
    content_type: string;
    data_base64: string;
  } | null;
};

export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (configured) {
    return normalizeBaseUrl(configured);
  }

  if (process.env.NODE_ENV !== "production") {
    return LOCAL_API_BASE_URL;
  }

  throw new Error(
    "Missing NEXT_PUBLIC_API_BASE_URL in production. Set it to your deployed backend URL."
  );
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as BackendError;
    return data.error || data.message || `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

async function requestJson<T>(
  path: string,
  init?: RequestInit,
  authToken?: string
): Promise<T> {
  const url = `${getApiBaseUrl()}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as T;
}

export async function getBackendHealth(): Promise<{ message?: string }> {
  return requestJson<{ message?: string }>("/", { method: "GET" });
}

export async function listParkingSlots() {
  const response = await requestJson<SlotsResponse>("/booking/slots", {
    method: "GET",
  });

  return response.slots ?? [];
}

export async function getUserDashboardHistory(authToken: string) {
  const response = await requestJson<DashboardHistoryResponse>(
    "/booking/history",
    { method: "GET" },
    authToken
  );

  return {
    bookings: response.bookings ?? [],
    sessions: response.sessions ?? [],
    payments: response.payments ?? [],
    slots: response.slots ?? [],
  };
}

export async function createBooking(authToken: string, slotId?: string) {
  const response = await requestJson<BookingCreateResponse>("/booking/create", {
      method: "POST",
      body: JSON.stringify({
        ...(slotId ? { slot_id: slotId } : {}),
      }),
    },
    authToken
  );

  if (!response.booking?.id) {
    throw new Error("Booking API did not return a booking id.");
  }

  return response;
}

export async function payBooking(authToken: string, bookingId: string, slotId?: string) {
  const response = await requestJson<BookingPayResponse>("/booking/pay", {
      method: "POST",
      body: JSON.stringify({
        booking_id: bookingId,
        ...(slotId ? { slot_id: slotId } : {}),
      }),
    },
    authToken
  );

  if (!response.session?.id) {
    throw new Error("Payment API did not return an active session.");
  }

  return response;
}

export async function getAdminMe(authToken: string) {
  return requestJson<AdminMeResponse>("/admin/me", { method: "GET" }, authToken);
}

export async function getAdminOverview(authToken: string) {
  const response = await requestJson<AdminOverviewResponse>(
    "/admin/overview",
    { method: "GET" },
    authToken
  );

  if (!response.metrics) {
    throw new Error("Admin overview metrics are unavailable.");
  }

  return response.metrics;
}

export async function listAdminSlots(authToken: string) {
  const response = await requestJson<AdminSlotsResponse>(
    "/admin/slots",
    { method: "GET" },
    authToken
  );

  return response.slots ?? [];
}

export async function createAdminSlot(
  authToken: string,
  payload: {
    slot_name: string;
    device_id: string;
    price: number;
    is_active: boolean;
  }
) {
  return requestJson<{ slot?: AdminSlot }>(
    "/admin/slots",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    authToken
  );
}

export async function updateAdminSlot(
  authToken: string,
  slotId: string,
  payload: Partial<{
    slot_name: string;
    device_id: string;
    price: number;
    is_active: boolean;
  }>
) {
  return requestJson<{ slot?: AdminSlot }>(
    `/admin/slots/${slotId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
    authToken
  );
}

export async function listAdminDevices(authToken: string) {
  const response = await requestJson<AdminDevicesResponse>(
    "/admin/devices",
    { method: "GET" },
    authToken
  );

  return response.devices ?? [];
}

export async function sendAdminDeviceCommand(
  authToken: string,
  deviceId: string,
  command: "open" | "close"
) {
  return requestJson<{ message?: string }>(
    `/admin/devices/${encodeURIComponent(deviceId)}/${command}`,
    { method: "POST" },
    authToken
  );
}

export async function listAdminBookings(authToken: string) {
  const response = await requestJson<AdminBookingsResponse>(
    "/admin/bookings",
    { method: "GET" },
    authToken
  );

  return response.bookings ?? [];
}

export async function updateAdminBookingStatus(
  authToken: string,
  bookingId: string,
  status: "PENDING_PAYMENT" | "PAID" | "COMPLETED" | "CANCELLED"
) {
  return requestJson<{ booking?: AdminBooking }>(
    `/admin/bookings/${bookingId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
    authToken
  );
}

export async function listAdminSessions(authToken: string) {
  const response = await requestJson<AdminSessionsResponse>(
    "/admin/sessions",
    { method: "GET" },
    authToken
  );

  return response.sessions ?? [];
}

export async function forceCloseAdminSession(authToken: string, sessionId: string) {
  return requestJson<{ message?: string; session?: AdminSession }>(
    `/admin/sessions/${sessionId}/force-close`,
    { method: "POST" },
    authToken
  );
}

export async function submitOwnerSubmission(
  authToken: string,
  payload: OwnerSubmissionPayload
) {
  return requestJson<{ message?: string; email_id?: string | null; recipient?: string }>(
    "/owner/submission",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    authToken
  );
}
