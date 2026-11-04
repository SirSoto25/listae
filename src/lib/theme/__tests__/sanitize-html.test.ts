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

  it("drops svg/smil animation vectors but keeps safe links", () => {
    const result = sanitizeThemeHtml(
      '<svg><animate attributeName="href" values="javascript:alert(1)"/></svg><a href="https://ok.example">x</a>',
    );

    expect(result).not.toContain("svg");
    expect(result).not.toContain("animate");
    expect(result).not.toContain("javascript:");
    expect(result).toContain('href="https://ok.example"');
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
