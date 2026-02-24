"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  CheckCircle2,
  DollarSign,
  Shield,
  Smartphone,
  TrendingUp,
  Zap,
} from "lucide-react";

const HERO_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1672084305798-ef85a8015c9f?auto=format&fit=crop&w=1600&q=80";
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1704269720184-8025fd29dc28?auto=format&fit=crop&w=1600&q=80";

const trustItems = [
  { icon: DollarSign, label: "Weekly Payouts" },
  { icon: Smartphone, label: "Owner App Control" },
  { icon: Shield, label: "KYC-Verified Drivers" },
  { icon: Zap, label: "IoT Smart Locks" },
];

const benefits = [
  "IoT-enabled security locking",
  "KYC-verified drivers only",
  "Payouts directly to your Bank Account via UPI",
  "Zero maintenance required",
];

export default function ListSpacePage() {
  const [heroImageFailed, setHeroImageFailed] = useState(false);

  return (
    <div className="bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <section className="relative overflow-hidden border-b border-slate-200 bg-white pb-16 pt-28 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-950 sm:pb-20 sm:pt-32">
        <div className="pointer-events-none absolute -left-16 -top-20 h-72 w-72 rounded-full bg-indigo-300/20 blur-[80px]" />
        <div className="pointer-events-none absolute -bottom-24 -right-20 h-96 w-96 rounded-full bg-indigo-500/20 blur-[120px] dark:bg-indigo-500/10" />

        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="space-y-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-300 bg-indigo-100 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-400">
                Bengaluru First
              </div>

              <h1 className="text-3xl font-black leading-tight tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
                Turn your idle parking space into smart monthly income.
              </h1>

              <p className="max-w-lg text-base font-medium leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg">
                Join Bengaluru&apos;s growing smart parking network. We install
                and manage the technology while you monetize unused space across
                Indiranagar, Koramangala, HSR, and Whitefield. The Z-Lock.
                Industrial Grade IoT.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                <Link
                  href="/signup?intent=partner"
                  className="w-full rounded-xl bg-indigo-600 px-8 py-3.5 text-center text-sm font-black uppercase tracking-[0.14em] text-white transition-colors hover:bg-indigo-700 sm:w-auto sm:text-base"
                >
                  Start Earning
                </Link>
                <Link
                  href="/login?intent=partner&next=/dashboard/owner"
                  className="w-full rounded-xl border border-slate-300 bg-white px-8 py-3.5 text-center text-sm font-black uppercase tracking-[0.14em] text-slate-900 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800 sm:w-auto sm:text-base"
                >
                  Partner Login
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  No Installation Fees
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  Full App Control
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  Live Occupancy Tracking
                </span>
              </div>
            </div>

            <div className="relative hidden md:block">
              <div className="glass-card overflow-hidden rounded-3xl p-3 shadow-2xl">
                <Image
                  src={
                    heroImageFailed
                      ? HERO_FALLBACK_IMAGE
                      : HERO_IMAGE
                  }
                  alt="Parking zone illustration for Bengaluru"
                  width={700}
                  height={700}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  onError={() => setHeroImageFailed(true)}
                  className="w-full rounded-2xl object-cover"
                />
              </div>
              <div className="glass-card absolute -right-6 -top-8 rounded-3xl p-6 shadow-2xl">
                <TrendingUp className="mb-2 h-10 w-10 text-indigo-600 dark:text-indigo-400" />
                <p className="text-3xl font-black text-slate-900 dark:text-white">
                  Up to INR 15,000 / month*
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Based on location and demand
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-100 py-8 text-slate-900 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900 dark:text-white">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-5 text-center md:grid-cols-4">
            {trustItems.map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-2.5">
                <div className="glass-card rounded-xl p-2.5">
                  <item.icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300 sm:tracking-[0.2em]">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 dark:bg-slate-950 sm:py-20 lg:py-24">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 md:grid-cols-2 lg:gap-16">
            <div className="space-y-7">
              <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                What You Can Earn With ZLOT
              </h3>
              <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg">
                Estimate your monthly earning by listing your parking space.
                Bengaluru zones near tech parks and metro lines usually drive
                the highest demand.
              </p>
              <div className="space-y-4">
                {benefits.map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card rounded-3xl p-8 shadow-xl sm:p-10">
              <h4 className="mb-7 text-2xl font-black text-slate-900 dark:text-white">
                Earning Calculator
              </h4>
              <div className="space-y-7">
                <div>
                  <label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Select Operating City
                  </label>
                  <select className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 p-4 font-semibold text-slate-900 outline-none transition focus:border-indigo-600 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                    <option>Bengaluru (Tier 1)</option>
                    <option>Hyderabad / Chennai / Pune (Tier 2)</option>
                    <option>Kolkata / Ahmedabad / Jaipur (Tier 3)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Monthly Demand
                  </label>
                  <input
                    type="range"
                    className="w-full cursor-pointer appearance-none rounded-lg accent-indigo-600"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-7 dark:border-slate-800">
                  <div>
                    <p className="mb-1 text-[10px] font-black uppercase text-slate-400">
                      Estimated Annual Earnings
                    </p>
                    <p className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                      INR 1,80,000
                    </p>
                  </div>
                  <div className="rounded-2xl bg-indigo-500/15 p-4">
                    <Zap className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
                  </div>
                </div>

                <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
                  Indicative, varies by location and usage
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}


