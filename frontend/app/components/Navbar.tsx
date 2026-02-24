"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { type User } from "@supabase/supabase-js";
import {
  ArrowRight,
  LogOut,
  Menu,
  Moon,
  ParkingSquare,
  Sun,
  User as UserIcon,
  X,
} from "lucide-react";

import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { setClientAuthCookie, setClientRoleCookie } from "@/lib/auth/clientSession";
import {
  accountTypeFromUser,
  dashboardPathForAccountType,
  type AccountType,
} from "@/lib/auth/accountType";
import { useTheme } from "./ThemeProvider";

const navLinks = [
  { name: "Home", path: "/" },
  { name: "About", path: "/about" },
  { name: "Find Parking", path: "/find-parking" },
  { name: "List Space", path: "/list-space" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [accountType, setAccountType] = useState<AccountType>("driver");
  const { toggleMode } = useTheme();

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      setClientAuthCookie(false);
      setClientRoleCookie(null);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    let mounted = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (mounted) {
        setUser(data.user ?? null);
        setClientAuthCookie(Boolean(data.user));
        const nextAccountType = accountTypeFromUser(data.user);
        setAccountType(nextAccountType);
        setClientRoleCookie(data.user ? nextAccountType : null);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setClientAuthCookie(Boolean(session?.user));
      const nextAccountType = accountTypeFromUser(session?.user);
      setAccountType(nextAccountType);
      setClientRoleCookie(session?.user ? nextAccountType : null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const logout = async () => {
    if (hasSupabaseEnv()) {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
    }
    setClientAuthCookie(false);
    setClientRoleCookie(null);
    closeMobileMenu();
    router.push("/login");
  };

  const baseLinkClass =
    "rounded-md px-2 py-1.5 text-xs font-bold uppercase tracking-[0.12em] transition-colors";
  const dashboardPath = dashboardPathForAccountType(accountType);
  const dashboardLabel = "Dashboard";

  return (
    <header className="fixed inset-x-0 top-2.5 z-50 px-3 sm:top-3 sm:px-5">
      <div
        className={`mx-auto w-full max-w-7xl rounded-full border backdrop-blur-xl transition-all duration-300 ${
          isScrolled
            ? "border-slate-200/90 bg-white/90 shadow-[0_20px_45px_-30px_rgba(15,23,42,0.35)] dark:border-white/15 dark:bg-slate-900/85 dark:shadow-[0_20px_45px_-30px_rgba(15,23,42,0.9)]"
            : "border-slate-200/80 bg-white/75 dark:border-white/12 dark:bg-slate-900/70"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-2.5 sm:px-6">
          <Link
            href="/"
            onClick={closeMobileMenu}
            className="group inline-flex items-center gap-2"
          >
            <span className="rounded-xl bg-indigo-600 p-2 text-white transition-transform duration-200 group-hover:scale-105 group-hover:bg-indigo-500">
              <ParkingSquare className="h-5 w-5" />
            </span>
            <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">ZLOT</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={`${baseLinkClass} ${
                  pathname === link.path
                    ? "text-slate-900 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <button
              onClick={toggleMode}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 transition-colors hover:border-indigo-400/50 hover:text-indigo-600 dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:text-indigo-300"
              aria-label="Toggle dark mode"
              type="button"
            >
              <Sun className="h-4 w-4 dark:hidden" />
              <Moon className="hidden h-4 w-4 dark:block" />
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href={dashboardPath}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-900 transition-colors hover:border-indigo-400/50 hover:text-indigo-600 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100 dark:hover:text-indigo-300"
                >
                  <UserIcon className="h-3.5 w-3.5" />
                  {dashboardLabel}
                </Link>
                <button
                  onClick={logout}
                  className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-rose-600 transition-colors hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-200"
                  type="button"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-700 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center rounded-full bg-slate-900 px-5 py-2 text-xs font-black uppercase tracking-[0.14em] text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  Join
                </Link>
              </>
            )}
          </div>

          <button
            className="rounded-lg p-2 text-slate-900 transition-colors hover:bg-slate-200/70 dark:text-slate-100 dark:hover:bg-white/10 md:hidden"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-label="Toggle menu"
            type="button"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="mx-auto mt-3 max-h-[calc(100vh-6rem)] w-full max-w-7xl overflow-y-auto rounded-3xl border border-slate-200 bg-white/95 px-4 pb-6 pt-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95 md:hidden">
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                onClick={closeMobileMenu}
                className={`rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                  pathname === link.path
                    ? "bg-indigo-600/15 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-300"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-white"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="mt-5 border-t border-slate-200 pt-5 dark:border-white/10">
            <button
              onClick={toggleMode}
              className="mb-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-200"
              type="button"
            >
              <Sun className="h-3.5 w-3.5 dark:hidden" />
              <Moon className="hidden h-3.5 w-3.5 dark:block" />
              Toggle Theme
            </button>

            {user ? (
              <div className="flex flex-col gap-2">
                <Link
                  href={dashboardPath}
                  onClick={closeMobileMenu}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:border-indigo-400/50 hover:text-indigo-600 dark:border-white/10 dark:text-slate-100 dark:hover:text-indigo-300"
                >
                  <UserIcon className="h-4 w-4" />
                  {dashboardLabel}
                </Link>
                <button
                  onClick={logout}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-300"
                  type="button"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={closeMobileMenu}
                  className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] text-slate-900 dark:border-white/10 dark:text-slate-100"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  onClick={closeMobileMenu}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white dark:bg-white dark:text-slate-900"
                >
                  Join
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
