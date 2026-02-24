"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { setClientAuthCookie } from "@/lib/auth/clientSession";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";

type AuthGateProps = {
  redirectTo?: string;
};

export default function AuthGate({ redirectTo = "/dashboard" }: AuthGateProps) {
  const router = useRouter();

  useEffect(() => {
    const loginPath = `/login?next=${encodeURIComponent(redirectTo)}`;

    if (!hasSupabaseEnv()) {
      setClientAuthCookie(false);
      router.push(loginPath);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    let mounted = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (!mounted) {
        return;
      }
      if (!data.user) {
        setClientAuthCookie(false);
        router.push(loginPath);
        return;
      }
      setClientAuthCookie(true);
    });

    return () => {
      mounted = false;
    };
  }, [redirectTo, router]);

  return null;
}
