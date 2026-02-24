import type { ReactNode } from "react";
import type { Metadata } from "next";

import Footer from "../components/Footer";
import Navbar from "../components/Navbar";

export const metadata: Metadata = {
  title: {
    default: "ZLOT | Smart Parking for Bengaluru",
    template: "%s | ZLOT",
  },
};

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="pt-16 sm:pt-[72px]">{children}</main>
      <Footer />
    </>
  );
}
