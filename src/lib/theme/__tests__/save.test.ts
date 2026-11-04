import { describe, expect, it } from "vitest";

import { buildThemeDocument, prepareThemeContent } from "../save";

describe("prepareThemeContent", () => {
  it("reports oversized html with a code and max param", () => {
    const result = prepareThemeContent("a".repeat(64 * 1024 + 1), "");

    expect(result).toEqual({
      ok: false,
      errors: [{ code: "htmlTooLarge", params: { max: 64 } }],
    });
  });
});

describe("buildThemeDocument", () => {
  it("sends link clicks to the top tab and sets the profile language", () => {
    const doc = buildThemeDocument("<a href=\"/title/1\">Dune</a>", "", "es");

    expect(doc).toContain('<base href="/" target="_top" />');
    expect(doc).toContain('<html lang="es">');
    expect(doc).toContain("script-src 'none'");
  });
});
