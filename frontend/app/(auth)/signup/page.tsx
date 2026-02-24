"use client";

import { type FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Home,
  Lock,
  Mail,
  ParkingSquare,
  User as UserIcon,
} from "lucide-react";

import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { setClientAuthCookie, setClientRoleCookie } from "@/lib/auth/clientSession";
import {
  accountTypeFromIntent,
  dashboardPathForAccountType,
} from "@/lib/auth/accountType";
import {
  mapAuthErrorMessage,
  validateEmail,
  validateFullName,
  validatePassword,
} from "@/lib/auth/validation";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1695692929156-69dc2e6444c4?auto=format&fit=crop&w=1800&q=80";
const HERO_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1704269720184-8025fd29dc28?auto=format&fit=crop&w=1600&q=80";

const benefits = [
  "Find and book verified spots instantly.",
  "List your driveway and start earning.",
  "Secure IoT access across Bengaluru.",
  "Manage everything from one dashboard.",
];

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const intent = searchParams.get("intent");
  const accountType = accountTypeFromIntent(intent);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [heroImageFailed, setHeroImageFailed] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const nameError = validateFullName(name);
    if (nameError) {
      setIsLoading(false);
      setError(nameError);
      return;
    }

    const emailError = validateEmail(email);
    if (emailError) {
      setIsLoading(false);
      setError(emailError);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setIsLoading(false);
      setError(passwordError);
      return;
    }

    if (!hasSupabaseEnv()) {
      setIsLoading(false);
      setError(
        "Missing Supabase env. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const normalizedName = name.trim();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          // Send both keys to support common Supabase profile triggers.
          full_name: normalizedName,
          name: normalizedName,
          account_type: accountType,
        },
        emailRedirectTo: window.location.origin,
      },
    });

    setIsLoading(false);

    if (signUpError) {
      setError(mapAuthErrorMessage(signUpError.message));
      return;
    }

    if (data.session?.user) {
      setClientAuthCookie(true);
      setClientRoleCookie(accountType);
      router.push(dashboardPathForAccountType(accountType));
      return;
    }

    setSuccess("Signup successful. Please check your email to confirm your account.");
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col md:flex-row">
        <aside className="relative hidden overflow-hidden border-r border-slate-200 bg-slate-100 md:flex md:w-1/2 md:items-center md:justify-center dark:border-slate-800 dark:bg-slate-900">
          <Image
            src={heroImageFailed ? HERO_FALLBACK_IMAGE : HERO_IMAGE}
            alt="Bengaluru parking infrastructure"
            fill
            priority
            sizes="50vw"
            onError={() => setHeroImageFailed(true)}
            className="object-cover opacity-25 dark:opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/70 to-white/85 dark:from-slate-950/30 dark:to-slate-950/65" />

          <div className="relative z-10 mx-auto max-w-lg p-12">
            <Link href="/" className="mb-12 inline-flex items-center gap-2">
              <span className="rounded-lg bg-indigo-600 p-2">
                <ParkingSquare className="h-6 w-6 text-white" />
              </span>
              <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                ZLOT
              </span>
            </Link>

            <h1 className="mb-8 text-4xl font-extrabold leading-tight text-slate-900 dark:text-white lg:text-5xl">
              One account for all your parking needs.
            </h1>

            <div className="space-y-5">
              {benefits.map((text) => (
                <div key={text} className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-indigo-400" />
                  <span className="font-medium">{text}</span>
                </div>
              ))}
            </div>
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
            <header className="mb-8 text-center md:text-left">
              <h2 className="mb-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Get started with ZLOT
              </h2>
              <p className="font-medium text-slate-500 dark:text-slate-300">
                Create your account to book parking or list your own space.
              </p>
            </header>

            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="text-sm font-semibold">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="text-sm font-semibold">{success}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block px-1 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Full Name
                  </label>
                  <div className="group relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <UserIcon className="h-5 w-5 text-slate-400 transition-colors group-focus-within:text-slate-700 dark:text-slate-500 dark:group-focus-within:text-slate-300" />
                    </span>
                    <input
                      type="text"
                      required
                      autoComplete="name"
                      placeholder="Arjun Sharma"
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 font-medium text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:border-indigo-500 dark:focus:bg-slate-900 dark:focus:ring-indigo-500/20"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block px-1 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Email Address
                  </label>
                  <div className="group relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <Mail className="h-5 w-5 text-slate-400 transition-colors group-focus-within:text-slate-700 dark:text-slate-500 dark:group-focus-within:text-slate-300" />
                    </span>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="name@example.com"
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 font-medium text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:border-indigo-500 dark:focus:bg-slate-900 dark:focus:ring-indigo-500/20"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block px-1 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Password
                  </label>
                  <div className="group relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <Lock className="h-5 w-5 text-slate-400 transition-colors group-focus-within:text-slate-700 dark:text-slate-500 dark:group-focus-within:text-slate-300" />
                    </span>
                    <input
                      type="password"
                      required
                      autoComplete="new-password"
                      placeholder="Create a strong password"
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 font-medium text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-200/60 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500 dark:focus:border-indigo-500 dark:focus:bg-slate-900 dark:focus:ring-indigo-500/20"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-center text-xs leading-relaxed text-slate-500 dark:text-slate-300">
                  By creating an account, you agree to our{" "}
                  <a href="#" className="font-bold text-slate-900 underline dark:text-white">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="#" className="font-bold text-slate-900 underline dark:text-white">
                    Privacy Policy
                  </a>
                  .
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`flex w-full items-center justify-center rounded-xl py-4 text-sm font-bold transition-all ${
                  isLoading
                    ? "cursor-not-allowed bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    : "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98] dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-700"
                }`}
              >
                {isLoading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700 dark:border-slate-600 dark:border-t-slate-100" />
                ) : (
                  <>
                    Create Free Account
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-sm font-medium text-slate-500 dark:text-slate-300">
              Already have an account?{" "}
              <Link
                href={intent ? `/login?intent=${encodeURIComponent(intent)}` : "/login"}
                className="ml-1 font-bold text-slate-900 hover:underline dark:text-white"
              >
                Log in here
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

