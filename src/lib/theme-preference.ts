export const THEME_COOKIE_NAME = "listae-theme";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export function parseThemePreference(
  value: string | undefined | null,
): ThemePreference {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return "system";
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === "light" || preference === "dark") {
    return preference;
  }
  return systemPrefersDark ? "dark" : "light";
}

export function themeClassName(resolved: ResolvedTheme): string {
  return resolved === "dark" ? "dark" : "";
}
