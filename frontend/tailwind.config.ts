import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        available: "var(--color-available)",
        occupied: "var(--color-occupied)",
        bg: "var(--color-bg)",
        card: "var(--color-card)",
      },
    },
  },
  plugins: [],
};

export default config;
