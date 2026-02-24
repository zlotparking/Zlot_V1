import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Account",
    template: "%s | ZLOT",
  },
  description: "Sign up or log in to your ZLOT account.",
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <main>{children}</main>;
}
