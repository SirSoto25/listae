import { describe, expect, it } from "vitest";

import {
  parseThemePreference,
  resolveTheme,
  themeClassName,
} from "./theme-preference";

describe("parseThemePreference", () => {
  it("accepts light, dark, and system", () => {
    expect(parseThemePreference("light")).toBe("light");
    expect(parseThemePreference("dark")).toBe("dark");
    expect(parseThemePreference("system")).toBe("system");
  });

  it("defaults invalid or missing values to system", () => {
    expect(parseThemePreference(undefined)).toBe("system");
    expect(parseThemePreference("nope")).toBe("system");
  });
});

describe("resolveTheme", () => {
  it("resolves system from OS preference", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("honors explicit preferences", () => {
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
  });
});

describe("themeClassName", () => {
  it("returns dark class only for dark resolved theme", () => {
    expect(themeClassName("dark")).toBe("dark");
    expect(themeClassName("light")).toBe("");
  });
});
