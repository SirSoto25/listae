export type ThemeCssError = {
  message: string;
  line?: number;
  column?: number;
  snippet?: string;
};

export type ThemeCssValidationResult =
  | { ok: true; css: string }
  | { ok: false; errors: ThemeCssError[] };

const GOOGLE_FONT_HOSTS = new Set([
  "fonts.googleapis.com",
  "fonts.gstatic.com",
]);

function locationAt(css: string, index: number) {
  const precedingText = css.slice(0, index);
  const lines = precedingText.split("\n");

  return {
    line: lines.length,
    column: lines.at(-1)!.length + 1,
  };
}

export function validateThemeCss(css: string): ThemeCssValidationResult {
  const errors: ThemeCssError[] = [];

  for (const [index, line] of css.split("\n").entries()) {
    const importMatch = line.match(/@import\b[^;]*(?:;|$)/i);
    if (!importMatch) {
      continue;
    }

    const snippet = importMatch[0];
    const urlMatch = snippet.match(
      /@import\s+(?:url\(\s*(['"]?)(.*?)\1\s*\)|(['"])(.*?)\3)/i,
    );
    const importUrl = urlMatch?.[2] ?? urlMatch?.[4];

    let allowed = false;
    if (importUrl) {
      try {
        const parsedUrl = new URL(importUrl);
        allowed =
          parsedUrl.protocol === "https:" &&
          GOOGLE_FONT_HOSTS.has(parsedUrl.hostname);
      } catch {
        allowed = false;
      }
    }

    if (!allowed) {
      errors.push({
        message: "Only Google Fonts HTTPS @import URLs are allowed.",
        line: index + 1,
        column: (importMatch.index ?? 0) + 1,
        snippet,
      });
    }
  }

  const expressionMatch = /expression\s*\(/i.exec(css);
  if (expressionMatch) {
    errors.push({
      message: "CSS expression() is not allowed.",
      ...locationAt(css, expressionMatch.index),
      snippet: expressionMatch[0],
    });
  }

  for (const match of css.matchAll(/url\s*\(\s*(['"]?)(.*?)\1\s*\)/gi)) {
    const url = match[2].trim();
    if (!url.toLowerCase().startsWith("https:")) {
      errors.push({
        message: "CSS url() values must use HTTPS.",
        ...locationAt(css, match.index),
        snippet: match[0],
      });
    }
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, css };
}
