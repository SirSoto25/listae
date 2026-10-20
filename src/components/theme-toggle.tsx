"use client";

import { useState } from "react";

import { THEME_COOKIE_NAME, type ThemePreference } from "@/lib/theme-preference";

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

type ThemeToggleProps = {
  initialPreference: ThemePreference;
  labels: Record<ThemePreference, string> & { label: string };
};

export function ThemeToggle({ initialPreference, labels }: ThemeToggleProps) {
  const [preference, setPreference] =
    useState<ThemePreference>(initialPreference);

  function cycle() {
    const next = CYCLE[(CYCLE.indexOf(preference) + 1) % CYCLE.length]!;
    setPreference(next);
    writeThemeCookie(next);
    applyResolved(next);
  }

  const mode = labels[preference];
  const label = labels.label.replace("{mode}", mode);

  return (
    <button
      type="button"
      className="text-muted hover:text-accent"
      onClick={cycle}
      aria-label={label}
      title={label}
    >
      {mode}
    </button>
  );
}
