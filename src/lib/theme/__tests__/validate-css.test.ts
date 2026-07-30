import { describe, expect, it } from "vitest";

import { validateThemeCss } from "../validate-css";

describe("validateThemeCss", () => {
  it("allows Google Fonts @import", () => {
    const css = `@import url('https://fonts.googleapis.com/css2?family=Inter&display=swap');\nbody { color: red; }`;
    const result = validateThemeCss(css);

    expect(result).toEqual({ ok: true, css });
  });

  it("allows Google Fonts @import with weight semicolons in URL", () => {
    const css = `@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap");\nbody { color: red; }`;
    const result = validateThemeCss(css);

    expect(result).toEqual({ ok: true, css });
  });

  it("allows Google Fonts @import from fonts.gstatic.com", () => {
    const css = `@import url('https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2');\nbody { color: red; }`;
    const result = validateThemeCss(css);

    expect(result).toEqual({ ok: true, css });
  });

  it("rejects non-Google @import with exact snippet", () => {
    const importSnippet = `@import url("https://evil.example/x.css");`;
    const css = `${importSnippet}\nbody{}`;
    const result = validateThemeCss(css);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].snippet).toBe(importSnippet);
      expect(result.errors[0].line).toBe(1);
    }
  });

  it("rejects a non-Google @import after an allowed import", () => {
    const evilImport = `@import url("https://evil.example/x.css");`;
    const css = `@import url("https://fonts.googleapis.com/css2?family=Inter");${evilImport}`;
    const result = validateThemeCss(css);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0].snippet).toBe(evilImport);
      expect(result.errors[0].line).toBe(1);
    }
  });

  it("rejects expression()", () => {
    const result = validateThemeCss(
      `body { width: expression(alert(1)); }`,
    );

    expect(result.ok).toBe(false);
  });

  it("rejects non-https url()", () => {
    const result = validateThemeCss(
      `body { background: url("http://insecure/x.png"); }`,
    );

    expect(result.ok).toBe(false);
  });

  it("rejects malformed https url() prefixes", () => {
    const result = validateThemeCss(
      `body { background: url("https:evil.example/x.png"); }`,
    );

    expect(result.ok).toBe(false);
  });
});
