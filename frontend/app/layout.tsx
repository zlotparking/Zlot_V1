import type { Metadata } from "next";
import Script from "next/script";
import ThemeProvider from "./components/ThemeProvider";
import "./globals.css";

const LOCAL_SITE_URL = "http://localhost:3000";

function normalizeUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function getSiteUrl(): string | null {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredSiteUrl) {
    return normalizeUrl(configuredSiteUrl);
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return normalizeUrl(vercelUrl);
  }

  if (process.env.NODE_ENV !== "production") {
    return LOCAL_SITE_URL;
  }

  return null;
}

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: {
    default: "ZLOT | Smart Parking for Bengaluru",
    template: "%s | ZLOT",
  },
  description:
    "ZLOT helps Bengaluru drivers find reliable parking and enables property owners to monetize unused spaces.",
  openGraph: {
    title: "ZLOT | Smart Parking for Bengaluru",
    description:
      "Reliable neighborhood parking with verified listings and practical access flow.",
    type: "website",
    ...(siteUrl ? { url: siteUrl } : {}),
    siteName: "ZLOT",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZLOT | Smart Parking for Bengaluru",
    description:
      "Reliable neighborhood parking with verified listings and practical access flow.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className="bg-background text-foreground antialiased transition-colors duration-300 dark:bg-slate-950 dark:text-white"
      >
        <Script id="theme-init" strategy="beforeInteractive">
          {`try {
  const storedTheme = localStorage.getItem("theme");
  const isDark = storedTheme ? storedTheme === "dark" : true;
  document.documentElement.classList.toggle("dark", isDark);
} catch {}`}
        </Script>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
