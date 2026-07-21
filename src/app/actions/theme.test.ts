import { describe, expect, it } from "vitest";

import {
  buildThemeDocument,
  prepareThemeForSave,
} from "@/lib/theme/save";

describe("prepareThemeForSave", () => {
  it("returns precise CSS diagnostics without accepting the theme", () => {
    const rejectedImport =
      '@import url("https://evil.example/theme.css");';
    const result = prepareThemeForSave({
      htmlTemplate: "<h1>{{displayName}}</h1>",
      customCss: `body { color: black; }\n${rejectedImport}`,
    });

    expect(result).toEqual({
      ok: false,
      errors: [
        expect.objectContaining({
          line: 2,
          column: 1,
          snippet: rejectedImport,
        }),
      ],
    });
  });

  it("allows Google Fonts and sanitizes HTML before persistence", () => {
    const customCss =
      '@import url("https://fonts.googleapis.com/css2?family=Inter");';
    const result = prepareThemeForSave({
      htmlTemplate:
        '<section onclick="alert(1)"><h1>{{displayName}}</h1><script>alert(1)</script></section>',
      customCss,
    });

    expect(result).toEqual({
      ok: true,
      theme: {
        htmlTemplate: "<section><h1>{{displayName}}</h1></section>",
        customCss,
      },
    });
  });
});

describe("buildThemeDocument", () => {
  it("prevents CSS from escaping the style element", () => {
    const document = buildThemeDocument(
      "<main>Safe profile</main>",
      "body{} </style><script>alert(1)</script>",
    );

    expect(document).not.toContain("</style><script>");
    expect(document).toContain("script-src 'none'");
  });
});
