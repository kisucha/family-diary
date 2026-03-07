"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type ThemeColor = "indigo" | "rose" | "emerald" | "amber" | "sky";
export type ThemeMode = "light" | "dark";

export interface Theme {
  mode: ThemeMode;
  color: ThemeColor;
}

const DEFAULT_THEME: Theme = { mode: "dark", color: "indigo" };

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({ theme: DEFAULT_THEME, setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("fp-theme");
    if (saved) {
      try {
        setThemeState(JSON.parse(saved));
      } catch {}
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.classList.remove("dark");
    root.classList.remove("theme-indigo", "theme-rose", "theme-emerald", "theme-amber", "theme-sky");
    if (theme.mode === "dark") root.classList.add("dark");
    root.classList.add(`theme-${theme.color}`);
  }, [theme, mounted]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("fp-theme", JSON.stringify(t));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
