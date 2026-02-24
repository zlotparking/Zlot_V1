import type { Metadata } from "next";
import Link from "next/link";
import { Heart, MapPin, ShieldCheck, Target, Users } from "lucide-react";
import SafeImage from "../../components/SafeImage";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn why ZLOT is building practical, neighborhood-first parking solutions in Bengaluru.",
};

const values = [
  {
    icon: Target,
    title: "Keep It Simple",
    desc: "No complex systems. If it works on the street, it works for us.",
  },
  {
    icon: Heart,
    title: "Respect Communities",
    desc: "Parking affects neighborhoods. We build with residents in mind.",
  },
  {
    icon: Users,
    title: "Fair for Everyone",
    desc: "Clear pricing for drivers and honest earnings for owners.",
  },
];

export default function AboutPage() {
  return (
    <div className="bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      <section className="border-b border-slate-200 bg-white pb-16 pt-24 text-slate-900 transition-colors duration-300 dark:border-slate-800 dark:bg-slate-950 dark:text-white sm:pb-20 sm:pt-28">
        <div className="mx-auto w-full max-w-6xl px-4 text-center sm:px-6">
          <h1 className="mb-6 text-3xl font-black tracking-tight sm:text-5xl md:text-6xl">
            Built for Bengaluru.
            <span className="block text-indigo-600 dark:text-indigo-400">
              Starting with Parking.
            </span>
          </h1>
          <p className="mx-auto max-w-3xl text-base text-slate-600 dark:text-slate-300 sm:text-lg md:text-xl">
            ZLOT is an early-stage Bengaluru startup trying to solve one simple,
            everyday problem: finding reliable parking in busy neighborhoods.
          </p>
        </div>
      </section>

      <section className="bg-white py-14 dark:bg-slate-950 sm:py-20 lg:py-24">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 sm:px-6 md:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              Why We Exist
            </h2>
            <h3 className="mb-6 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Parking in Bengaluru is broken.
            </h3>
            <div className="space-y-5 text-base leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg">
              <p>
                Anyone who drives in Bengaluru knows the problem: circles around
                the block, blocked driveways, unclear rules, and wasted time.
              </p>
              <p>
                At the same time, thousands of residential and commercial parking
                spaces sit unused every day. ZLOT exists to connect these two
                sides simply and responsibly.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
              <div className="glass-card rounded-2xl p-5">
                <ShieldCheck className="mb-3 h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                <h4 className="font-bold text-slate-900 dark:text-white">
                  Verified Spaces
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Every listed space is reviewed before going live.
                </p>
              </div>

              <div className="glass-card rounded-2xl p-5">
                <MapPin className="mb-3 h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                <h4 className="font-bold text-slate-900 dark:text-white">
                  Local Focus
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  We grow area by area, not city by city.
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            <SafeImage
              src="https://images.unsplash.com/photo-1687158267344-0e2c97ac9b17?auto=format&fit=crop&w=1400&q=80"
              alt="Bengaluru city street visual"
              width={1200}
              height={1500}
              className="aspect-4/5 w-full rounded-3xl object-cover shadow-xl"
            />
          </div>
        </div>
      </section>

      <section className="bg-slate-100 py-14 transition-colors duration-300 dark:bg-slate-900/70 sm:py-20 lg:py-24">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="mb-12 text-center sm:mb-16">
            <h2 className="mb-4 text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
              What We Care About
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              Simple principles that guide how we build ZLOT.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 md:gap-8">
            {values.map((value) => (
              <div
                key={value.title}
                className="glass-card rounded-3xl p-6 sm:p-8"
              >
                <div className="mb-5 inline-block rounded-2xl bg-indigo-100 p-4 dark:bg-indigo-500/15">
                  <value.icon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h4 className="mb-3 text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                  {value.title}
                </h4>
                <p className="leading-relaxed text-slate-500 dark:text-slate-300">
                  {value.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-14 transition-colors duration-300 dark:bg-slate-950 sm:py-20 lg:py-24">
        <div className="mx-auto w-full max-w-6xl px-4 text-center sm:px-6">
          <h2 className="mb-6 text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
            We&apos;re just getting started.
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-base text-slate-500 dark:text-slate-300 sm:text-lg">
            If you drive in Bengaluru or own unused parking space, we&apos;d love
            for you to be part of ZLOT&apos;s early journey.
          </p>

          <Link
            href="/signup"
            className="inline-block rounded-xl bg-indigo-600 px-9 py-3 text-base font-black text-white shadow-lg transition-transform hover:scale-[1.02] hover:bg-indigo-700 dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-700 sm:px-12 sm:py-4 sm:text-lg"
          >
            Join Early
          </Link>
        </div>
      </section>
    </div>
  );
}


