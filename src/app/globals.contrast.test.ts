import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(__dirname, "globals.css"), "utf8");

function block(selector: RegExp): Record<string, string> {
  const m = css.match(selector);
  const vars: Record<string, string> = {};
  if (!m) return vars;
  for (const v of m[1].matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/g)) vars[v[1]] = v[2];
  return vars;
}

const light = block(/:root\s*\{([^}]*)\}/);
const dark = { ...light, ...block(/\.dark\s*\{([^}]*)\}/) };

function lum(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a: string, b: string) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

const pairs: [fg: string, bg: string, min: number][] = [
  ["--muted", "--background", 4.5],
  ["--muted", "--surface", 4.5],
  ["--border-control", "--surface", 3],
  ["--border-control", "--background", 3],
  ["--accent", "--surface", 3],
  ["--accent", "--background", 3],
  ["--success-fg", "--success-bg", 4.5],
  ["--danger", "--surface", 4.5],
  ["--warning", "--surface", 4.5],
];

describe.each([
  ["light", light],
  ["dark", dark],
])("WCAG AA contrast (%s theme)", (_name, vars) => {
  it.each(pairs)("%s on %s >= %f", (fg, bg, min) => {
    expect(vars[fg], `${fg} defined`).toBeDefined();
    expect(vars[bg], `${bg} defined`).toBeDefined();
    expect(ratio(vars[fg], vars[bg])).toBeGreaterThanOrEqual(min);
  });
});

describe("global focus and placeholder rules", () => {
  it("has a focus-visible outline using the accent", () => {
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--accent\)/);
  });
  it("keeps placeholder opacity at 1", () => {
    expect(css).toMatch(/::placeholder\s*\{[^}]*opacity:\s*1/);
  });
});
