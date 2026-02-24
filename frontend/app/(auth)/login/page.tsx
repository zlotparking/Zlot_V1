"use client";

import { Suspense, type FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Home,
  Lock,
  Mail,
  ParkingSquare,
} from "lucide-react";

import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { setClientAuthCookie, setClientRoleCookie } from "@/lib/auth/clientSession";
import {
  accountTypeFromIntent,
  accountTypeFromUser,
  dashboardPathForAccountType,
} from "@/lib/auth/accountType";
import { mapAuthErrorMessage, validateEmail } from "@/lib/auth/validation";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1672084306210-383820924b61?auto=format&fit=crop&w=1800&q=80";
const HERO_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1704269720184-8025fd29dc28?auto=format&fit=crop&w=1600&q=80";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const intent = searchParams.get("intent");

  const getSafeNextPath = useCallback(() => {
    const nextPath = searchParams.get("next");
    if (!nextPath) {
      return null;
    }
    return nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : null;
  }, [searchParams]);

  const getDashboardPath = useCallback(
    (fallbackUserAccountType: ReturnType<typeof accountTypeFromUser>) => {
    const safeNextPath = getSafeNextPath();
    if (safeNextPath) {
      return safeNextPath;
    }

    const accountType = intent
      ? accountTypeFromIntent(intent)
      : fallbackUserAccountType;
    return dashboardPathForAccountType(accountType);
  },
  [getSafeNextPath, intent]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [heroImageFailed, setHeroImageFailed] = useState(false);

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    let mounted = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (mounted && data.user) {
        const accountType = intent
          ? accountTypeFromIntent(intent)
          : accountTypeFromUser(data.user);
        setClientAuthCookie(true);
        setClientRoleCookie(accountType);
        router.push(getDashboardPath(accountType));
      }
    });

    return () => {
      mounted = false;
    };
  }, [getDashboardPath, intent, router]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const emailError = validateEmail(email);
    if (emailError) {
      setLoading(false);
      setError(emailError);
      return;
    }
    if (!password) {
      setLoading(false);
      setError("Password is required.");
      return;
    }

    if (!hasSupabaseEnv()) {
      setLoading(false);
      setError(
        "Missing Supabase env. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(mapAuthErrorMessage(signInError.message));
      return;
    }

    let accountType = accountTypeFromUser(data.user);
    if (intent) {
      accountType = accountTypeFromIntent(intent);
      if (data.user && accountTypeFromUser(data.user) !== accountType) {
        await supabase.auth.updateUser({
          data: {
            ...(data.user.user_metadata ?? {}),
            account_type: accountType,
          },
        });
      }
    }

    setClientAuthCookie(true);
    setClientRoleCookie(accountType);
    router.push(getDashboardPath(accountType));
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col md:flex-row">
        <aside className="relative hidden overflow-hidden border-r border-slate-200 bg-slate-100 md:flex md:w-1/2 md:items-center md:justify-center dark:border-slate-800 dark:bg-slate-900">
          <Image
            src={heroImageFailed ? HERO_FALLBACK_IMAGE : HERO_IMAGE}
            alt="City parking in Bengaluru"
            fill
            priority
            sizes="50vw"
            onError={() => setHeroImageFailed(true)}
            className="object-cover opacity-25 dark:opacity-35"
          />
          <div className="absolute inset-0 bg-linear-to-t from-white/80 via-white/40 to-transparent dark:from-slate-950 dark:via-slate-950/50" />

          <div className="relative z-10 mx-auto max-w-lg p-12">
            <Link href="/" className="mb-12 inline-flex items-center gap-3">
              <span className="rounded-lg bg-indigo-600 p-2.5">
                <ParkingSquare className="h-6 w-6 text-white" />
              </span>
              <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                ZLOT
              </span>
            </Link>

            <h1 className="mb-6 text-4xl font-extrabold leading-tight text-slate-900 dark:text-white lg:text-5xl">
              Stress-free parking for Namma Bengaluru.
            </h1>
            <p className="max-w-md text-lg font-medium leading-relaxed text-slate-700 dark:text-slate-200">
              Access verified parking spots across Indiranagar, Koramangala,
              and Whitefield.
            </p>
          </div>
        </aside>

        <section className="relative flex flex-1 items-center justify-center p-6 sm:p-10 md:p-14 lg:p-20">
          <Link
            href="/"
            className="absolute right-6 top-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white sm:right-8 sm:top-8"
          >
            <Home className="h-4 w-4" />
            <span>Home</span>
          </Link>

          <div className="w-full max-w-md">
            <header className="mb-8">
              <h2 className="mb-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Welcome back
              </h2>
              <p className="font-medium text-slate-500 dark:text-slate-300">
                Log in to your ZLOT account to continue.
              </p>
            </header>

            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="text-sm font-semibold">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="mb-2 block px-1 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Email Address
                </label>
                <div className="group relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-slate-700 dark:text-slate-500 dark:group-focus-within:text-slate-300" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 font-medium text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:border-indigo-500 dark:focus:bg-slate-900 dark:focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between px-1">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Password
                  </label>
                </div>
                <div className="group relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-slate-700 dark:text-slate-500 dark:group-focus-within:text-slate-300" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-12 font-medium text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:border-indigo-500 dark:focus:bg-slate-900 dark:focus:ring-indigo-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`flex w-full items-center justify-center rounded-xl py-4 text-sm font-bold shadow-[0_8px_20px_rgba(0,0,0,0.2)] transition-all ${
                  loading
                    ? "cursor-not-allowed bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    : "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98] dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-700"
                }`}
              >
                {loading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700 dark:border-slate-600 dark:border-t-slate-100" />
                ) : (
                  <>
                    Sign in to ZLOT
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-300">
                Don&apos;t have an account?
                <Link
                  href={intent ? `/signup?intent=${encodeURIComponent(intent)}` : "/signup"}
                  className="ml-1 font-bold text-slate-900 hover:underline dark:text-white"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Loading login...
          </p>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}


