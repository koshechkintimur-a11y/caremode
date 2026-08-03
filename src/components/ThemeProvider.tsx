"use client";

import { useEffect, useState, createContext, useContext } from "react";

export type Theme = "light" | "dark" | "system";

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const Ctx = createContext<ThemeCtx>({ theme: "light", setTheme: () => {} });
export const useTheme = () => useContext(Ctx);

// Дефолт по роли (meta ставит server-layout): PARTNER — тёмная, OWNER — светлая.
function defaultTheme(): Theme {
  const role = document
    .querySelector('meta[name="sync-role"]')
    ?.getAttribute("content");
  return role === "PARTNER" ? "dark" : "light";
}

function apply(theme: Theme) {
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

// Ленивая инициализация: сохранённый ЯВНЫЙ выбор или дефолт по роли.
// В localStorage пишем только когда пользователь сам выбрал тему —
// иначе дефолт по роли «замораживается» на странице логина (роль неизвестна).
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    const saved = localStorage.getItem("sync-theme") as Theme | null;
    return saved ?? defaultTheme();
  });

  const setTheme = (t: Theme) => {
    localStorage.setItem("sync-theme", t);
    setThemeState(t);
  };

  useEffect(() => {
    apply(theme);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply(theme);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}
