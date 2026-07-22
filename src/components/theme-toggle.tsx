"use client";

import { useEffect, useState } from "react";

import {
  THEME_COOKIE_NAME,
  parseThemePreference,
  type ThemePreference,
} from "@/lib/theme-preference";

function writeThemeCookie(value: ThemePreference) {
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${THEME_COOKIE_NAME}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

function applyResolved(preference: ThemePreference) {
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved =
    preference === "system" ? (systemDark ? "dark" : "light") : preference;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.style.colorScheme = resolved;
}

const CYCLE: ThemePreference[] = ["light", "dark", "system"];

export function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${THEME_COOKIE_NAME}=`));
    const raw = match?.split("=")[1];
    const parsed = parseThemePreference(raw);
    setPreference(parsed);
  }, []);

  function cycle() {
    const next = CYCLE[(CYCLE.indexOf(preference) + 1) % CYCLE.length]!;
    setPreference(next);
    writeThemeCookie(next);
    applyResolved(next);
  }

  const label =
    preference === "light"
      ? "Theme: Light"
      : preference === "dark"
        ? "Theme: Dark"
        : "Theme: System";

  return (
    <button
      type="button"
      className="text-muted hover:text-accent"
      onClick={cycle}
      aria-label={label}
      title={label}
    >
      {preference === "light" ? "Light" : preference === "dark" ? "Dark" : "System"}
    </button>
  );
}
