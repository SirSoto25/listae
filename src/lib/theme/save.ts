import { sanitizeThemeHtml } from "./sanitize-html";
import {
  validateThemeCss,
  type ThemeCssError,
} from "./validate-css";

export type ThemeSaveInput = {
  htmlTemplate: string;
  customCss: string;
};

export type PreparedTheme =
  | {
      ok: true;
      theme: ThemeSaveInput;
    }
  | {
      ok: false;
      errors: ThemeCssError[];
    };

export function prepareThemeForSave(
  input: ThemeSaveInput,
): PreparedTheme {
  const cssResult = validateThemeCss(input.customCss);
  if (!cssResult.ok) {
    return cssResult;
  }

  return {
    ok: true,
    theme: {
      htmlTemplate: sanitizeThemeHtml(input.htmlTemplate),
      customCss: cssResult.css,
    },
  };
}

function escapeStyleEndTags(css: string): string {
  return css.replace(/<\/style/gi, "<\\/style");
}

export function buildThemeDocument(html: string, css: string): string {
  const safeCss = escapeStyleEndTags(css);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src https: data:;" />
    <base href="/" />
    <style>${safeCss}</style>
  </head>
  <body>${html}</body>
</html>`;
}
