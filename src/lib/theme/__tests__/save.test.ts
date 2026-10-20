import { describe, expect, it } from "vitest";

import { buildThemeDocument } from "../save";

describe("buildThemeDocument", () => {
  it("sends link clicks to the top tab and sets the profile language", () => {
    const doc = buildThemeDocument("<a href=\"/title/1\">Dune</a>", "", "es");

    expect(doc).toContain('<base href="/" target="_top" />');
    expect(doc).toContain('<html lang="es">');
    expect(doc).toContain("script-src 'none'");
  });
});
