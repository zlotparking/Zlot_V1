"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

type ThemeMode = "light" | "dark";

type ThemeContextValue = {
  mode: ThemeMode;
  dark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_STORAGE_KEY = "theme";

function applyMode(mode: ThemeMode) {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.classList.toggle("dark", mode === "dark");
  localStorage.setItem(THEME_STORAGE_KEY, mode);
}

function getStoredMode(): ThemeMode | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }

  return null;
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return "dark";
    }

    const storedMode = getStoredMode();
    if (storedMode) {
      return storedMode;
    }

    if (document.documentElement.classList.contains("dark")) {
      return "dark";
    }
    return "dark";
  });

  useEffect(() => {
    applyMode(mode);
  }, [mode]);

  const setMode = (nextMode: ThemeMode) => {
    setModeState(nextMode);
  };

  const toggleMode = () => {
    setModeState((currentMode) => (currentMode === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider
      value={{
        mode,
        dark: mode === "dark",
        setMode,
        toggleMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }
  return context;
}
