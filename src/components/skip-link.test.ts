import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SkipLink } from "./skip-link";

describe("SkipLink", () => {
  it("targets the main landmark and is visible on focus", () => {
    const html = renderToStaticMarkup(createElement(SkipLink, { label: "Saltar al contenido" }));
    expect(html).toContain('href="#main"');
    expect(html).toContain("sr-only");
    expect(html).toContain("focus:not-sr-only");
    expect(html).toContain("Saltar al contenido");
  });
});
