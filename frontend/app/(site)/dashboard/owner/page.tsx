import type { Metadata } from "next";

import AuthGate from "../AuthGate";
import OwnerDashboardClient from "./OwnerDashboardClient";

export const metadata: Metadata = {
  title: "Space Provider Submission",
  description:
    "Submit property details with parking images and video for ZLOT onboarding review.",
};

export default function OwnerDashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-16 pt-24 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
      <AuthGate redirectTo="/dashboard/owner" />
      <div className="mx-auto w-full max-w-7xl">
        <OwnerDashboardClient />
      </div>
    </div>
  );
}
