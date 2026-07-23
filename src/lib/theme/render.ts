import { renderProfileHtml, type ProfileEntry } from "./placeholders";
import { prepareThemeContent } from "./save";
import { type ThemeCssError } from "./validate-css";

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
  const prepared = prepareThemeContent(template, css);
  if (!prepared.ok) {
    return prepared;
  }

  const html = renderProfileHtml({
    template: prepared.template,
    username,
    displayName,
    entries,
  });

  return { ok: true, html, css: prepared.css };
}
