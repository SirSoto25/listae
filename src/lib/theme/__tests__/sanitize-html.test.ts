import { describe, expect, it } from "vitest";

import { sanitizeThemeHtml } from "../sanitize-html";

describe("sanitizeThemeHtml", () => {
  it("strips script elements", () => {
    const result = sanitizeThemeHtml(
      `<div>Safe<script>alert("unsafe")</script></div>`,
    );

    expect(result).toBe("<div>Safe</div>");
  });

  it("strips event handler attributes", () => {
    const result = sanitizeThemeHtml(
      `<div onclick="alert('unsafe')">Safe</div>`,
    );

    expect(result).toBe("<div>Safe</div>");
  });

  it("keeps allowed structural elements", () => {
    const result = sanitizeThemeHtml(
      `<section><div><h1>Profile</h1><p>About</p></div></section>`,
    );

    expect(result).toBe(
      "<section><div><h1>Profile</h1><p>About</p></div></section>",
    );
  });

  it("keeps images with HTTPS sources", () => {
    const result = sanitizeThemeHtml(
      `<img src="https://images.example/cover.jpg" alt="Cover" />`,
    );

    expect(result).toBe(
      `<img src="https://images.example/cover.jpg" alt="Cover" />`,
    );
  });
});
