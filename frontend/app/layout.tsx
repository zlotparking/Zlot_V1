import type { Metadata } from "next";
import Script from "next/script";
import ThemeProvider from "./components/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
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
    url: "http://localhost:3000",
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
