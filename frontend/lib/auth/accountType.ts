import type { User } from "@supabase/supabase-js";

export const ACCOUNT_TYPES = ["driver", "partner"] as const;

export type AccountType = (typeof ACCOUNT_TYPES)[number];

const PARTNER_HINTS = new Set(["partner", "owner", "list-space"]);

function normalizeAccountType(value: unknown): AccountType | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "driver") {
    return "driver";
  }
  if (PARTNER_HINTS.has(normalized)) {
    return "partner";
  }
  return null;
}

export function accountTypeFromIntent(intent: string | null): AccountType {
  const fromIntent = normalizeAccountType(intent);
  return fromIntent ?? "driver";
}

export function accountTypeFromUser(user: User | null | undefined): AccountType {
  if (!user) {
    return "driver";
  }

  const metadata = user.user_metadata ?? {};
  return (
    normalizeAccountType(metadata.account_type) ??
    normalizeAccountType(metadata.role) ??
    "driver"
  );
}

export function dashboardPathForAccountType(accountType: AccountType): string {
  return accountType === "partner" ? "/dashboard/owner" : "/dashboard";
}
