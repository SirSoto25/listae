import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

import {
  sanitizeThemeHtml,
  sanitizeThemeTemplateMarkup,
} from "./sanitize-html";
import {
  validateThemeCss,
  type ThemeCssError,
} from "./validate-css";

/**
 * sanitize-html is slow on huge inputs and profiles re-render on every view.
 * Bounds the template only: the final document also grows with the entries
 * (render cache: T2.6).
 */
export const MAX_THEME_HTML_LENGTH = 64 * 1024;

export type ThemeSaveInput = {
  htmlTemplate: string;
  customCss: string;
};

export type PreparedThemeContent =
  | { ok: true; template: string; css: string }
  | { ok: false; errors: ThemeCssError[] };

export type PreparedTheme =
  | {
      ok: true;
      theme: ThemeSaveInput;
    }
  | {
      ok: false;
      errors: ThemeCssError[];
    };

export type ValidatedThemeContent =
  | { ok: true; css: string }
  | { ok: false; errors: ThemeCssError[] };

/** Template length and CSS rules. Does not touch the HTML. */
export function validateThemeContent(
  template: string,
  css: string,
): ValidatedThemeContent {
  if (template.length > MAX_THEME_HTML_LENGTH) {
    return {
      ok: false,
      errors: [
        {
          code: "htmlTooLarge",
          params: { max: MAX_THEME_HTML_LENGTH / 1024 },
        },
      ],
    };
  }

  return validateThemeCss(css);
}

export function prepareThemeContent(
  template: string,
  css: string,
): PreparedThemeContent {
  const validated = validateThemeContent(template, css);
  if (!validated.ok) {
    return validated;
  }

  return {
    ok: true,
    template: sanitizeThemeHtml(template),
    css: validated.css,
  };
}

/**
 * `{{` inside a tag of **sanitized** HTML. Reliable because sanitize-html
 * escapes `<` and `>` in attribute values, so `<…>` is always a real tag.
 */
export function findPlaceholderInMarkup(sanitizedHtml: string): boolean {
  return /<[^>]*\{\{/.test(sanitizedHtml);
}

const MAX_SNIPPET_LENGTH = 120;

/**
 * Best-effort location of the first `{{` inside a tag of the raw input,
 * for the editor. Detection itself relies on `findPlaceholderInMarkup`.
 */
function locatePlaceholderInMarkup(
  html: string,
): Pick<ThemeCssError, "line" | "column" | "snippet"> {
  let inTag = false;
  let quote: string | null = null;

  for (let index = 0; index < html.length; index++) {
    const character = html[index]!;

    if (!inTag) {
      if (html.startsWith("<!--", index)) {
        const end = html.indexOf("-->", index + 4);
        if (end === -1) {
          break;
        }
        index = end + 2;
      } else if (character === "<" && /[a-z/]/i.test(html[index + 1] ?? "")) {
        inTag = true;
      }
      continue;
    }

    if (quote) {
      if (character === quote) {
        quote = null;
      }
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === ">") {
      inTag = false;
      continue;
    }

    if (html.startsWith("{{", index)) {
      const lines = html.slice(0, index).split("\n");
      const lineStart = index - lines.at(-1)!.length;
      const lineEnd = html.indexOf("\n", index);
      return {
        line: lines.length,
        column: lines.at(-1)!.length + 1,
        snippet: html
          .slice(lineStart, lineEnd === -1 ? undefined : lineEnd)
          .trim()
          .slice(0, MAX_SNIPPET_LENGTH),
      };
    }
  }

  return {};
}

export function prepareThemeForSave(
  input: ThemeSaveInput,
): PreparedTheme {
  const prepared = prepareThemeContent(input.htmlTemplate, input.customCss);
  if (!prepared.ok) {
    return prepared;
  }

  // A placeholder inside an attribute lets the substituted value assemble
  // a URL scheme (`java{{x}}script:`) or break out of the attribute.
  if (
    findPlaceholderInMarkup(sanitizeThemeTemplateMarkup(input.htmlTemplate))
  ) {
    return {
      ok: false,
      errors: [
        {
          code: "placeholderInAttribute",
          ...locatePlaceholderInMarkup(input.htmlTemplate),
        },
      ],
    };
  }

  return {
    ok: true,
    theme: {
      htmlTemplate: prepared.template,
      customCss: prepared.css,
    },
  };
}

function escapeStyleEndTags(css: string): string {
  return css.replace(/<\/style/gi, "<\\/style");
}

export function buildThemeDocument(
  html: string,
  css: string,
  lang: Locale = DEFAULT_LOCALE,
): string {
  const safeCss = escapeStyleEndTags(css);

  return `<!doctype html>
<html lang="${lang}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src https: data:;" />
    <base href="/" target="_top" />
    <style>${safeCss}</style>
  </head>
  <body>${html}</body>
</html>`;
}
