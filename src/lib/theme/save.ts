import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";

import { sanitizeThemeHtml } from "./sanitize-html";
import {
  validateThemeCss,
  type ThemeCssError,
} from "./validate-css";

/** sanitize-html is slow on huge inputs and profiles re-render on every view. */
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

export function prepareThemeContent(
  template: string,
  css: string,
): PreparedThemeContent {
  if (template.length > MAX_THEME_HTML_LENGTH) {
    return {
      ok: false,
      errors: [
        {
          message: `HTML template must be at most ${MAX_THEME_HTML_LENGTH / 1024} KB.`,
        },
      ],
    };
  }

  const cssResult = validateThemeCss(css);
  if (!cssResult.ok) {
    return cssResult;
  }

  return {
    ok: true,
    template: sanitizeThemeHtml(template),
    css: cssResult.css,
  };
}

export function prepareThemeForSave(
  input: ThemeSaveInput,
): PreparedTheme {
  const prepared = prepareThemeContent(input.htmlTemplate, input.customCss);
  if (!prepared.ok) {
    return prepared;
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
