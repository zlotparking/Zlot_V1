import type { Metadata } from "next";
import { getApiBaseUrl } from "@/lib/api/backend";
import AuthGate from "./AuthGate";
import DashboardClient from "./DashboardClient";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage bookings, sessions, and gate operations from your ZLOT dashboard.",
};

type BackendStatus = {
  status: "Online" | "Offline";
  hint: string;
};

async function getBackendStatus(): Promise<BackendStatus> {
  let apiBaseUrl: string;
  try {
    apiBaseUrl = getApiBaseUrl();
  } catch {
    return {
      status: "Offline",
      hint: "Missing NEXT_PUBLIC_API_BASE_URL. Set it to your deployed backend URL.",
    };
  }

  try {
    const response = await fetch(`${apiBaseUrl}/`, { cache: "no-store" });
    if (!response.ok) {
      return {
        status: "Offline",
        hint: "Backend not reachable. Start backend server to enable live operations.",
      };
    }

    const data = (await response.json()) as { message?: string };
    return {
      status: "Online",
      hint: data.message || "Backend health endpoint is responding.",
    };
  } catch {
    return {
      status: "Offline",
      hint: "Backend not reachable. Start backend server to enable live operations.",
    };
  }
}

export default async function DashboardPage() {
  const backend = await getBackendStatus();

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-16 pt-24 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
      <AuthGate />
      <div className="mx-auto w-full max-w-7xl">
        <DashboardClient backend={backend} />
      </div>
    </div>
  );
}
