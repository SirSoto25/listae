import { renderProfileHtml, type ProfileEntry } from "./placeholders";
import { sanitizeThemeHtml } from "./sanitize-html";
import {
  validateThemeCss,
  type ThemeCssError,
} from "./validate-css";

export type RenderThemeArgs = {
  template: string;
  css: string;
  username: string;
  displayName: string;
  entries: ProfileEntry[];
};

export type RenderThemeResult =
  | { ok: true; html: string; css: string }
  | { ok: false; errors: ThemeCssError[] };

export function renderTheme({
  template,
  css,
  username,
  displayName,
  entries,
}: RenderThemeArgs): RenderThemeResult {
  const cssResult = validateThemeCss(css);
  if (!cssResult.ok) {
    return cssResult;
  }

  const sanitizedTemplate = sanitizeThemeHtml(template);
  const html = renderProfileHtml({
    template: sanitizedTemplate,
    username,
    displayName,
    entries,
  });

  return { ok: true, html, css: cssResult.css };
}
