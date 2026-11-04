export const THEME_ERROR_CODES = [
  "htmlTooLarge",
  "cssTooLarge",
  "cssEscapeOutsideString",
  "importNotAllowed",
  "expressionNotAllowed",
  "imageSetNotAllowed",
  "urlNotHttps",
  "urlMalformed",
  "invalidDomainColors",
  "placeholderInAttribute",
] as const;

export type ThemeErrorCode = (typeof THEME_ERROR_CODES)[number];

export type ThemeCssError = {
  code: ThemeErrorCode;
  params?: Record<string, string | number>;
  line?: number;
  column?: number;
  snippet?: string;
};

export type ThemeCssValidationResult =
  | { ok: true; css: string }
  | { ok: false; errors: ThemeCssError[] };

/** Keeps validation linear and responses small for hostile input. */
export const MAX_THEME_CSS_LENGTH = 64 * 1024;
const MAX_REPORTED_ERRORS = 20;
const MAX_SNIPPET_LENGTH = 120;

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

function clipSnippet(snippet: string): string {
  return snippet.length > MAX_SNIPPET_LENGTH
    ? `${snippet.slice(0, MAX_SNIPPET_LENGTH)}…`
    : snippet;
}

/**
 * Index of the first backslash outside strings and comments. CSS escapes in
 * identifiers (`\75rl(`, `@\69mport`) would slip past the lexical checks.
 */
function findEscapeOutsideStrings(css: string): number {
  let stringChar: '"' | "'" | null = null;

  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (stringChar) {
      if (ch === "\\") i++;
      else if (ch === stringChar) stringChar = null;
      continue;
    }
    if (ch === "/" && css[i + 1] === "*") {
      const close = css.indexOf("*/", i + 2);
      if (close === -1) return -1;
      i = close + 1;
      continue;
    }
    if (ch === '"' || ch === "'") stringChar = ch;
    else if (ch === "\\") return i;
  }

  return -1;
}

/**
 * Finds the index after the semicolon that terminates a CSS at-rule value,
 * scanning no further than `limit`.
 */
function findCssRuleTerminator(
  css: string,
  start: number,
  limit = css.length,
): number {
  let i = start;
  let parenDepth = 0;
  let stringChar: '"' | "'" | null = null;

  while (i < limit) {
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

  return Math.min(i, limit);
}

function findAtImportRules(css: string): Array<{ index: number; snippet: string }> {
  const results: Array<{ index: number; snippet: string }> = [];

  const starts = Array.from(css.matchAll(/@import\b/gi), (m) => m.index!);

  for (const [n, start] of starts.entries()) {
    // Bound each rule by the next @import so unterminated rules stay linear.
    const limit = starts[n + 1] ?? css.length;
    let i = start + "@import".length;

    while (i < css.length && /\s/.test(css[i])) {
      i++;
    }

    const end = findCssRuleTerminator(css, i, limit);
    results.push({
      index: start,
      snippet: css.slice(start, end),
    });
  }

  return results;
}

export function validateThemeCss(css: string): ThemeCssValidationResult {
  if (css.length > MAX_THEME_CSS_LENGTH) {
    return {
      ok: false,
      errors: [
        {
          code: "cssTooLarge",
          params: { max: MAX_THEME_CSS_LENGTH / 1024 },
        },
      ],
    };
  }

  const errors: ThemeCssError[] = [];
  const report = (code: ThemeErrorCode, index: number, snippet: string) => {
    if (errors.length < MAX_REPORTED_ERRORS) {
      errors.push({
        code,
        ...locationAt(css, index),
        snippet: clipSnippet(snippet),
      });
    }
  };

  const escapeIndex = findEscapeOutsideStrings(css);
  if (escapeIndex !== -1) {
    report(
      "cssEscapeOutsideString",
      escapeIndex,
      css.slice(escapeIndex, escapeIndex + 16),
    );
  }

  for (const { index, snippet } of findAtImportRules(css)) {
    if (errors.length >= MAX_REPORTED_ERRORS) break;
    const urlMatch = snippet.match(
      /@import\s+(?:url\(\s*(['"])([\s\S]*?)\1\s*\)|(['"])([\s\S]*?)\3)/i,
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
      report(
        "importNotAllowed",
        index,
        snippet,
      );
    }
  }

  const expressionMatch = /expression\s*\(/i.exec(css);
  if (expressionMatch) {
    report(
      "expressionNotAllowed",
      expressionMatch.index,
      expressionMatch[0],
    );
  }

  const imageSetMatch = /\b(?:image-set|src)\s*\(/i.exec(css);
  if (imageSetMatch) {
    report(
      "imageSetNotAllowed",
      imageSetMatch.index,
      imageSetMatch[0],
    );
  }

  // Linear pattern: quoted bodies stop at their quote, bare ones at a delimiter.
  const wellFormedUrlStarts = new Set<number>();
  for (const match of css.matchAll(
    /url\s*\(\s*(?:"([^"\n]*)"|'([^'\n]*)'|([^'"()\s]*))\s*\)/gi,
  )) {
    wellFormedUrlStarts.add(match.index);
    const url = (match[1] ?? match[2] ?? match[3] ?? "").trim();
    if (!isWellFormedHttpsUrl(url)) {
      report(
        "urlNotHttps",
        match.index,
        match[0],
      );
    }
  }
  for (const match of css.matchAll(/url\s*\(/gi)) {
    if (!wellFormedUrlStarts.has(match.index)) {
      report("urlMalformed", match.index, match[0]);
    }
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, css };
}
