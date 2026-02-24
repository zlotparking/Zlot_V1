"use client";

import Link from "next/link";
import { ArrowRight, Cpu, LayoutGrid, ShieldCheck, Star } from "lucide-react";
import SafeImage from "../components/SafeImage";

const traction = [
  { label: "PILOT AREAS LIVE", value: "Pilot Areas Live" },
  { label: "NEIGHBORHOODS COVERED", value: "Neighborhoods Covered" },
  { label: "BUILT WITH PROPERTY OWNERS", value: "Built with Owners" },
  { label: "FOCUSED ON DAILY DRIVERS", value: "Focused on Drivers" },
];

const features = [
  {
    icon: LayoutGrid,
    title: "Local First",
    desc: "Focused on specific streets and neighborhoods where parking is genuinely difficult.",
  },
  {
    icon: ShieldCheck,
    title: "Trust & Safety",
    desc: "Clear access rules, verified spaces, and simple guidelines for both drivers and owners.",
  },
  {
    icon: Cpu,
    title: "Built to Grow",
    desc: "Simple systems today, better features tomorrow expanding only when it makes sense.",
  },
];

const avatarImages = [
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80",
];

export default function HomePage() {
  return (
    <div className="relative overflow-hidden bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-50">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-indigo-500/12 blur-[120px] dark:bg-indigo-600/20" />
      <div className="pointer-events-none absolute -left-24 top-[24rem] h-[20rem] w-[20rem] rounded-full bg-indigo-400/10 blur-[100px] dark:bg-indigo-500/15" />
      <div className="pointer-events-none absolute -right-24 top-[52rem] h-[20rem] w-[20rem] rounded-full bg-slate-300/30 blur-[110px] dark:bg-indigo-400/10" />

      <section className="relative border-b border-slate-200 bg-white pt-24 pb-20 dark:border-white/10 dark:bg-slate-950 sm:pt-28 sm:pb-24 md:pt-40 md:pb-32">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 md:grid-cols-2 md:items-center md:gap-14">
          <div className="z-10 space-y-10">
            <div className="inline-flex items-center space-x-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 shadow-sm dark:border-white/10 dark:bg-slate-900/80">
              <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                Local
              </span>
              <span className="text-[12px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                Built with Bengaluru in mind
              </span>
            </div>

            <h1 className="text-4xl leading-[0.92] font-black tracking-tighter text-slate-900 dark:text-white sm:text-5xl md:text-7xl xl:text-8xl">
              Parking in <br />
              <span className="bg-gradient-to-r from-slate-900 to-slate-500 bg-clip-text text-transparent dark:from-white dark:to-indigo-300">
                Bengaluru.
              </span>
            </h1>

            <p className="max-w-xl text-base leading-relaxed font-medium text-slate-500 dark:text-slate-300 sm:text-lg md:text-xl">
              Find reliable parking in key Bengaluru neighborhoods like Koramangala, Indiranagar, and Whitefield.
              Built to reduce daily parking stress starting with select areas.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row sm:gap-4">
              <Link
                href="/find-parking"
                className="inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-8 py-3.5 text-base font-bold text-white transition-colors hover:bg-indigo-700 sm:w-auto sm:px-10 sm:py-4 sm:text-lg"
              >
                Find Parking <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                href="/list-space"
                className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-8 py-3.5 text-base font-bold text-slate-900 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800 sm:w-auto sm:px-10 sm:py-4 sm:text-lg"
              >
                List Your Space
              </Link>
            </div>

            <div className="flex flex-col items-start gap-4 pt-2 sm:flex-row sm:items-center sm:gap-8">
              <div className="flex -space-x-3">
                {avatarImages.map((src, index) => (
                  <SafeImage
                    key={src}
                    src={src}
                    alt={`Early driver ${index + 1}`}
                    width={96}
                    height={96}
                    className="h-12 w-12 rounded-full border-4 border-white object-cover shadow-sm dark:border-slate-900"
                  />
                ))}
              </div>
              <div>
                <p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-400">
                  Early Bengaluru Drivers
                </p>
                <div className="flex flex-wrap items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-3 w-3 fill-indigo-500 text-indigo-500" />
                  ))}
                  <span className="ml-2 text-sm font-bold text-slate-900 dark:text-white">
                    Feedback from early users
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-300/25 blur-[140px] dark:bg-indigo-500/25" />
            <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-200 bg-slate-50 p-4 shadow-2xl dark:border-white/10 dark:bg-slate-900/70">
              <SafeImage
                src="https://images.unsplash.com/photo-1590674899484-d5640e854abe?q=80&w=2070&auto=format&fit=crop"
                alt="Parking in Bengaluru"
                width={2070}
                height={1400}
                priority
                className="w-full rounded-[1.8rem] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
              <div className="absolute right-4 bottom-4 left-4 sm:right-8 sm:bottom-8 sm:left-8">
                <div className="flex items-center space-x-4 rounded-2xl border border-white/20 bg-white/90 p-4 shadow-xl backdrop-blur dark:bg-slate-900/80">
                  <div className="rounded-lg bg-indigo-600 p-2 text-white">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      Pilot Launch
                    </p>
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      Available in select Bengaluru locations
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-900 py-14 text-white dark:border-white/10 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
            {traction.map((stat) => (
              <div key={stat.label} className="space-y-2">
                <h3 className="text-2xl leading-tight font-black text-indigo-300 sm:text-3xl md:text-4xl">
                  {stat.value}
                </h3>
                <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-100 py-16 dark:bg-slate-900/40 sm:py-24 md:py-32">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="mb-14 max-w-3xl sm:mb-20">
            <h2 className="mb-6 text-sm font-black uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-300">
              Why ZLOT
            </h2>
            <h3 className="mb-6 text-3xl leading-tight font-black tracking-tighter text-slate-900 dark:text-white sm:text-4xl md:mb-8 md:text-5xl">
              Built around real Bengaluru parking problems.
            </h3>
            <p className="text-base leading-relaxed font-medium text-slate-500 dark:text-slate-300 sm:text-lg md:text-xl">
              We&apos;re starting small, working closely with drivers and property owners, and improving the
              experience step by step.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm transition-colors dark:border-white/10 dark:bg-slate-900/80 sm:p-10"
              >
                <feature.icon className="mb-6 h-8 w-8 text-slate-900 dark:text-indigo-300" />
                <h4 className="mb-4 text-2xl font-black text-slate-900 dark:text-white">{feature.title}</h4>
                <p className="leading-relaxed font-medium text-slate-500 dark:text-slate-300">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="rounded-[2rem] bg-slate-900 px-6 py-12 text-center dark:bg-slate-900 sm:rounded-[3rem] sm:px-10 sm:py-20 md:px-20 md:py-28">
            <h2 className="mb-6 text-3xl leading-tight font-black text-white sm:text-4xl md:text-6xl">
              <span className="block">Namma Bengaluru.</span>
              <span className="block text-indigo-300">Namma Parking.</span>
            </h2>

            <p className="mx-auto mb-10 max-w-2xl text-base font-medium text-slate-400 sm:mb-12 sm:text-lg md:text-xl">
              Join thousands of Bengaluru property owners earning up to INR 25,000 monthly from their unused parking
              spaces.
            </p>

            <div className="flex flex-col items-center justify-center gap-6 sm:flex-row">
              <Link
                href="/signup"
                className="w-full rounded-xl bg-indigo-600 px-10 py-4 text-base font-black text-white shadow-lg transition-colors hover:bg-indigo-700 sm:w-auto sm:text-lg"
              >
                Start Earning
              </Link>

              <Link
                href="/about"
                className="flex items-center gap-2 font-bold text-white transition-colors hover:text-indigo-300"
              >
                Our Bengaluru Vision <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
