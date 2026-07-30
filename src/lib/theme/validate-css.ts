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

function isWellFormedHttpsUrl(value: string): boolean {
  if (!/^https:\/\//i.test(value)) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}

function locationAt(css: string, index: number) {
  const precedingText = css.slice(0, index);
  const lines = precedingText.split("\n");

  return {
    line: lines.length,
    column: lines.at(-1)!.length + 1,
  };
}

/** Finds the index after the semicolon that terminates a CSS at-rule value. */
function findCssRuleTerminator(css: string, start: number): number {
  let i = start;
  let parenDepth = 0;
  let stringChar: '"' | "'" | null = null;

  while (i < css.length) {
    const ch = css[i];

    if (stringChar) {
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === stringChar) {
        stringChar = null;
      }
      i++;
      continue;
    }

    if (ch === '"' || ch === "'") {
      stringChar = ch;
      i++;
      continue;
    }

    if (ch === "(") {
      parenDepth++;
      i++;
      continue;
    }

    if (ch === ")") {
      if (parenDepth > 0) {
        parenDepth--;
      }
      i++;
      continue;
    }

    if (ch === ";" && parenDepth === 0) {
      return i + 1;
    }

    i++;
  }

  return i;
}

function findAtImportRules(css: string): Array<{ index: number; snippet: string }> {
  const results: Array<{ index: number; snippet: string }> = [];

  for (const match of css.matchAll(/@import\b/gi)) {
    const start = match.index!;
    let i = start + match[0].length;

    while (i < css.length && /\s/.test(css[i])) {
      i++;
    }

    const end = findCssRuleTerminator(css, i);
    results.push({
      index: start,
      snippet: css.slice(start, end),
    });
  }

  return results;
}

export function validateThemeCss(css: string): ThemeCssValidationResult {
  const errors: ThemeCssError[] = [];

  for (const { index, snippet } of findAtImportRules(css)) {
    const urlMatch = snippet.match(
      /@import\s+(?:url\(\s*(['"])(.*?)\1\s*\)|(['"])(.*?)\3)/is,
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
        ...locationAt(css, index),
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
    if (!isWellFormedHttpsUrl(url)) {
      errors.push({
        message: "CSS url() values must be well-formed HTTPS URLs.",
        ...locationAt(css, match.index),
        snippet: match[0],
      });
    }
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, css };
}
