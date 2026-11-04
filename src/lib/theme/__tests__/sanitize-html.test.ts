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

  it("keeps images with HTTPS sources and never sends the referrer", () => {
    const result = sanitizeThemeHtml(
      `<img src="https://images.example/cover.jpg" alt="Cover" referrerpolicy="unsafe-url" />`,
    );

    expect(result).toBe(
      `<img src="https://images.example/cover.jpg" alt="Cover" referrerpolicy="no-referrer" />`,
    );
  });

  it("forces rel on links", () => {
    expect(
      sanitizeThemeHtml('<a href="/title/1" rel="opener" target="_top">x</a>'),
    ).toBe('<a href="/title/1" target="_top" rel="noopener noreferrer">x</a>');
  });

  it("drops links and images with entity-encoded or protocol-relative urls", () => {
    const result = sanitizeThemeHtml(
      '<a href="&#106;avascript:alert(1)">a</a><a href="/\\evil.example">b</a><img src="//evil.example/x.png" />',
    );

    expect(result).toBe(
      '<a rel="noopener noreferrer">a</a><a rel="noopener noreferrer">b</a><img referrerpolicy="no-referrer" />',
    );
  });

  it("allows Listae data attributes only on the tags that use them", () => {
    const result = sanitizeThemeHtml(
      '<section data-status="plan" data-domain="reading" data-type="x"><table><tbody><tr data-type="book" data-index="1" data-status="y"><td>z</td></tr></tbody></table></section><div data-status="plan"></div>',
    );

    expect(result).toBe(
      '<section data-status="plan" data-domain="reading"><table><tbody><tr data-type="book" data-index="1"><td>z</td></tr></tbody></table></section><div></div>',
    );
  });
});
