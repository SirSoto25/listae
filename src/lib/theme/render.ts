import { renderProfileHtml, type ProfileEntry, type ProfileTranslator } from "./placeholders";
import { sanitizeThemeHtml } from "./sanitize-html";
import { validateThemeContent } from "./save";
import { type ThemeCssError } from "./validate-css";

export type RenderThemeArgs = {
  template: string;
  css: string;
  username: string;
  displayName: string;
  entries: ProfileEntry[];
  t: ProfileTranslator;
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
  t,
}: RenderThemeArgs): RenderThemeResult {
  const validated = validateThemeContent(template, css);
  if (!validated.ok) {
    return validated;
  }

  // Substitute first, sanitize the final document (SEC-M1, ADR 015).
  // Sanitizing the template alone let `java{{x}}script:` pass as a
  // relative URL and become `javascript:` once `{{x}}` was empty. Legacy
  // templates with placeholders in attributes keep rendering: whatever the
  // substitution builds there is cleaned here.
  const html = sanitizeThemeHtml(
    renderProfileHtml({ template, username, displayName, entries, t }),
  );

  return { ok: true, html, css: validated.css };
}
