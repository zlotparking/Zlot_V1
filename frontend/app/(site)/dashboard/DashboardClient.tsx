"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CarFront,
  Clock3,
  CreditCard,
  IndianRupee,
  MapPin,
} from "lucide-react";

import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { getUserDashboardHistory } from "@/lib/api/backend";

type BackendStatus = {
  status: "Online" | "Offline";
  hint: string;
};

type BookingRow = {
  id: string;
  device_id: string | null;
  amount: number | null;
  status: string | null;
  created_at: string | null;
};

type SessionRow = {
  id: string;
  slot_id: string | null;
  device_id: string | null;
  status: string | null;
  entry_expiry: string | null;
  created_at: string | null;
  device_ref: string | null;
};

type PaymentRow = {
  id: string;
  session_id: string | null;
  amount: number | null;
  status: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string | null;
};

type SlotRow = {
  id: string;
  slot_name: string | null;
  device_id: string | null;
};

type DashboardClientProps = {
  backend: BackendStatus;
};

const DEVICE_LOCATIONS: Record<string, string> = {
  GATE_001: "Yelahanka Main Road, Bengaluru",
  GATE_002: "Indiranagar 100ft Road, Bengaluru",
  GATE_003: "Koramangala 4th Block, Bengaluru",
  GATE_004: "Whitefield ITPL Corridor, Bengaluru",
};

function formatDateTime(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function minutesBetween(start: string | null, end: string | null): number {
  if (!start) {
    return 0;
  }

  const startMs = new Date(start).getTime();
  if (Number.isNaN(startMs)) {
    return 0;
  }

  const endMs = end ? new Date(end).getTime() : Date.now();
  if (Number.isNaN(endMs)) {
    return 0;
  }

  return Math.max(0, Math.round((endMs - startMs) / (1000 * 60)));
}

function formatDuration(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
    return "0m";
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) {
    return `${minutes}m`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getDeviceLocation(deviceId: string | null): string {
  if (!deviceId) {
    return "Unassigned node";
  }
  return DEVICE_LOCATIONS[deviceId] ?? `Node ${deviceId}`;
}

function getSessionLocation(session: SessionRow, slotById: Map<string, SlotRow>): string {
  if (session.slot_id) {
    const slot = slotById.get(session.slot_id);
    if (slot) {
      const slotLabel = slot.slot_name?.trim() || "Parking Slot";
      return `${slotLabel} - ${getDeviceLocation(slot.device_id || session.device_id)}`;
    }
  }

  return getDeviceLocation(session.device_id);
}

function paymentIsSuccessful(status: string | null): boolean {
  const normalized = (status || "").toUpperCase();
  return normalized === "SUCCESS" || normalized === "PAID" || normalized === "CAPTURED";
}

export default function DashboardClient({ backend }: DashboardClientProps) {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [slotById, setSlotById] = useState<Map<string, SlotRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      setError(null);

      if (!hasSupabaseEnv()) {
        setError(
          "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
        );
        setLoading(false);
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setError("Unable to load user data. Please log in again.");
          setLoading(false);
          return;
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        const authToken = session?.access_token;

        if (sessionError || !authToken) {
          setError("Unable to load user session. Please log in again.");
          setLoading(false);
          return;
        }

        const history = await getUserDashboardHistory(authToken);
        const bookingRows = history.bookings as BookingRow[];
        const sessionRows = history.sessions as SessionRow[];
        const paymentRows = history.payments as PaymentRow[];

        setBookings(bookingRows);
        setSessions(sessionRows);
        setPayments(paymentRows);

        if (history.slots.length === 0) {
          setSlotById(new Map());
          return;
        }

        const map = new Map<string, SlotRow>();
        history.slots.forEach((slot) => {
          map.set(slot.id, slot as SlotRow);
        });
        setSlotById(map);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load dashboard information."
        );
      } finally {
        setLoading(false);
      }
    };

    void loadUserData();
  }, []);

  const activeSessions = useMemo(
    () =>
      sessions.filter((item) => {
        const status = (item.status || "").toUpperCase();
        return status === "ACTIVE" || status === "IN_PROGRESS";
      }),
    [sessions]
  );

  const successfulPayments = useMemo(
    () => payments.filter((payment) => paymentIsSuccessful(payment.status)),
    [payments]
  );

  const totalSpend = useMemo(
    () => successfulPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [successfulPayments]
  );

  const totalParkedMinutes = useMemo(
    () =>
      sessions.reduce((sum, item) => {
        const status = (item.status || "").toUpperCase();
        const end =
          status === "ACTIVE" || status === "IN_PROGRESS" ? null : item.entry_expiry;
        return sum + minutesBetween(item.created_at, end);
      }, 0),
    [sessions]
  );

  const sessionById = useMemo(() => {
    const map = new Map<string, SessionRow>();
    sessions.forEach((session) => map.set(session.id, session));
    return map;
  }, [sessions]);

  const overviewCards = [
    {
      title: "Backend Health",
      value: backend.status,
      hint: backend.hint,
      icon: Activity,
    },
    {
      title: "Total Bookings",
      value: `${bookings.length}`,
      hint: "Rows from bookings table",
      icon: CarFront,
    },
    {
      title: "Total Parked Time",
      value: formatDuration(totalParkedMinutes),
      hint: "Calculated from parking_sessions rows",
      icon: Clock3,
    },
    {
      title: "Total Spend",
      value: formatCurrency(totalSpend),
      hint: "Successful rows from payments table",
      icon: IndianRupee,
    },
  ];

  return (
    <div className="space-y-8">
      <section className="glass-card rounded-3xl p-7 shadow-sm sm:p-10">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
          User Dashboard
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Parking history, live slots, and payments in one place.
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
          This view reads from secured backend APIs backed by your Supabase schema:{" "}
          <span className="font-semibold">bookings</span>,{" "}
          <span className="font-semibold">parking_sessions</span>,{" "}
          <span className="font-semibold">payments</span>, and{" "}
          <span className="font-semibold">parking_slots</span>.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/find-parking"
            className="inline-flex items-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-700"
          >
            Find a Spot
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {overviewCards.map((card) => (
          <div
            key={card.title}
            className="glass-card rounded-2xl p-5 shadow-sm"
          >
            <div className="inline-flex rounded-xl bg-indigo-100 p-2.5 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
              <card.icon className="h-5 w-5" />
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              {card.title}
            </p>
            <p className="mt-2 text-xl font-black text-slate-900 dark:text-white">
              {card.value}
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {card.hint}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-card rounded-3xl p-6 shadow-sm sm:p-7">
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
            Active Parking Sessions
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Live occupancy details from parking_sessions.
          </p>

          <div className="mt-5 space-y-3">
            {loading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Loading sessions...
              </p>
            ) : activeSessions.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                No active session right now.
              </p>
            ) : (
              activeSessions.map((session) => {
                const parkedMins = minutesBetween(session.created_at, null);
                return (
                  <article
                    key={session.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                        <MapPin className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        {getSessionLocation(session, slotById)}
                      </div>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                        {session.status || "ACTIVE"}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                      <p>
                        Start:{" "}
                        <span className="font-semibold">
                          {formatDateTime(session.created_at)}
                        </span>
                      </p>
                      <p>
                        Parked:{" "}
                        <span className="font-semibold">{formatDuration(parkedMins)}</span>
                      </p>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>

        <div className="glass-card rounded-3xl p-6 shadow-sm sm:p-7">
          <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
            Payment History
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Successful and recent transactions from payments.
          </p>

          <div className="mt-5 space-y-3">
            {loading ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Loading payments...
              </p>
            ) : successfulPayments.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                No successful payment records yet.
              </p>
            ) : (
              successfulPayments.slice(0, 8).map((payment) => {
                const linkedSession = payment.session_id
                  ? sessionById.get(payment.session_id)
                  : null;
                const location = linkedSession
                  ? getSessionLocation(linkedSession, slotById)
                  : "Session reference unavailable";

                return (
                  <article
                    key={payment.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {location}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {formatDateTime(payment.created_at)}
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-1 rounded-xl bg-indigo-100 px-3 py-1.5 text-sm font-black text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400">
                        <CreditCard className="h-4 w-4" />
                        {formatCurrency(Number(payment.amount || 0))}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </section>

      <section className="glass-card rounded-3xl p-6 shadow-sm sm:p-7">
        <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
          Booking History
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Full booking trail with status and node details.
        </p>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-[760px] divide-y divide-slate-200 dark:divide-slate-800">
            <thead>
              <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                <th className="pb-3 pr-4">Booking ID</th>
                <th className="pb-3 pr-4">Location</th>
                <th className="pb-3 pr-4">Amount</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td className="py-4 text-slate-500 dark:text-slate-400" colSpan={5}>
                    Loading booking history...
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td className="py-4 text-slate-500 dark:text-slate-400" colSpan={5}>
                    No booking records found.
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="py-4 pr-4 font-semibold text-slate-900 dark:text-white font-data">
                      {booking.id.slice(0, 8)}
                    </td>
                    <td className="py-4 pr-4 text-slate-600 dark:text-slate-300">
                      {getDeviceLocation(booking.device_id)}
                    </td>
                    <td className="py-4 pr-4 text-slate-600 dark:text-slate-300">
                      {formatCurrency(Number(booking.amount || 0))}
                    </td>
                    <td className="py-4 pr-4">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {booking.status || "Unknown"}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-slate-600 dark:text-slate-300">
                      {formatDateTime(booking.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}


