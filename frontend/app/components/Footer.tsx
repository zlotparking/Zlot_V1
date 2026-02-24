import Link from "next/link";
import {
  ArrowRight,
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  ParkingSquare,
  Phone,
  Twitter,
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 pt-10 pb-4 text-slate-900 transition-colors duration-300 dark:border-white/10 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto w-full max-w-7xl px-6">
        <div className="mb-8 grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-6">
            <Link href="/" className="flex items-center space-x-2">
              <div className="rounded-lg bg-indigo-600 p-1.5">
                <ParkingSquare className="h-7 w-7 text-white" />
              </div>
              <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                ZLOT
              </span>
            </Link>

            <p className="max-w-xs text-sm leading-relaxed font-medium text-slate-500 dark:text-slate-400">
              ZLOT is a Bengaluru-based smart parking platform. We help drivers find verified parking spots and enable
              property owners to monetize unused spaces using IoT-enabled access control.
            </p>

            <div className="flex space-x-4">
              {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition-all hover:border-indigo-500/50 hover:text-indigo-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-indigo-300"
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Explore
            </h4>
            <ul className="space-y-4 text-sm font-medium text-slate-600 dark:text-slate-300">
              <li>
                <Link href="/" className="transition-colors hover:text-indigo-600 dark:hover:text-indigo-300">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/about" className="transition-colors hover:text-indigo-600 dark:hover:text-indigo-300">
                  Our Story
                </Link>
              </li>
              <li>
                <Link
                  href="/find-parking"
                  className="transition-colors hover:text-indigo-600 dark:hover:text-indigo-300"
                >
                  Find Parking
                </Link>
              </li>
              <li>
                <Link
                  href="/list-space"
                  className="transition-colors hover:text-indigo-600 dark:hover:text-indigo-300"
                >
                  List Your Space
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Support
            </h4>
            <ul className="space-y-4 text-sm font-medium text-slate-600 dark:text-slate-300">
              <li>
                <a href="#" className="transition-colors hover:text-indigo-600 dark:hover:text-indigo-300">
                  Help &amp; FAQs
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-indigo-600 dark:hover:text-indigo-300">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-indigo-600 dark:hover:text-indigo-300">
                  Terms of Use
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Bengaluru
            </h4>
            <ul className="space-y-4 text-sm font-medium text-slate-600 dark:text-slate-300">
              <li className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-300" />
                <span>Yelahanka, Bengaluru, Karnataka</span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-300" />
                <span>+91 80 0000 0000</span>
              </li>
              <li className="flex items-center space-x-3">
                <Mail className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-300" />
                <span>zlotparking@gmail.com</span>
              </li>
            </ul>

            <form className="mt-6 flex items-center gap-3">
              <input
                type="email"
                placeholder="Email"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 outline-none transition-colors focus:border-indigo-500 dark:border-white/10 dark:bg-slate-900 dark:text-white"
              />
              <button
                type="submit"
                aria-label="Subscribe"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white transition-colors hover:bg-indigo-700"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between border-t border-slate-200 pt-6 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:border-white/10 md:flex-row">
          <p>&copy; {new Date().getFullYear()} ZLOT · Built in Bengaluru</p>

          <div className="mt-4 flex space-x-6 md:mt-0">
            <a href="#" className="transition-colors hover:text-slate-900 dark:hover:text-white">
              Privacy
            </a>
            <a href="#" className="transition-colors hover:text-slate-900 dark:hover:text-white">
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
