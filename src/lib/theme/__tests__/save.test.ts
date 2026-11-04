import { describe, expect, it } from "vitest";

import {
  buildThemeDocument,
  findPlaceholderInMarkup,
  prepareThemeContent,
  prepareThemeForSave,
} from "../save";

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

describe("prepareThemeForSave placeholders in markup", () => {
  it("rejects placeholders inside attribute values with their location", () => {
    const result = prepareThemeForSave({
      htmlTemplate: '<a href="{{username}}">x</a>',
      customCss: "",
    });

    expect(result).toEqual({
      ok: false,
      errors: [
        {
          code: "placeholderInAttribute",
          line: 1,
          column: 10,
          snippet: '<a href="{{username}}">x</a>',
        },
      ],
    });
  });

  it("rejects the assembled-scheme PoC on save", () => {
    const result = prepareThemeForSave({
      htmlTemplate:
        '<main>\n  <p>ok</p>\n  <a title="a>b" href="java{{reading_lists}}script:alert(1)">x</a>\n</main>',
      customCss: "",
    });

    expect(result).toMatchObject({
      ok: false,
      errors: [{ code: "placeholderInAttribute", line: 3, column: 28 }],
    });
  });

  it("accepts placeholders in text", () => {
    const result = prepareThemeForSave({
      htmlTemplate: "<p>{{username}}</p>",
      customCss: "",
    });

    expect(result).toEqual({
      ok: true,
      theme: { htmlTemplate: "<p>{{username}}</p>", customCss: "" },
    });
  });

  it("does not mistake a > inside an attribute for the end of the tag", () => {
    const result = prepareThemeForSave({
      htmlTemplate: '<p title="a>b">{{username}}</p>',
      customCss: "",
    });

    expect(result).toEqual({
      ok: true,
      theme: { htmlTemplate: '<p title="a&gt;b">{{username}}</p>', customCss: "" },
    });
  });

  it("ignores placeholders in attributes the sanitizer strips anyway", () => {
    const result = prepareThemeForSave({
      htmlTemplate: '<p onclick="{{username}}">{{username}}</p>',
      customCss: "",
    });

    expect(result).toEqual({
      ok: true,
      theme: { htmlTemplate: "<p>{{username}}</p>", customCss: "" },
    });
  });
});

describe("findPlaceholderInMarkup", () => {
  it("only matches braces inside a tag of sanitized html", () => {
    expect(findPlaceholderInMarkup('<a href="{{x}}">y</a>')).toBe(true);
    expect(findPlaceholderInMarkup("<p>{{x}}</p>")).toBe(false);
    expect(findPlaceholderInMarkup('<p title="a&gt;b">{{x}}</p>')).toBe(false);
  });
});
