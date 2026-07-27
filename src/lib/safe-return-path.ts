const LOCALE_PREFIX = /^\/(es|en)(?=\/|$)/;
const TITLE_PATH =
  /^\/(?:es|en)\/title\/[0-9a-f-]{36}(?:\?[^#]*)?$/i;
const LIBRARY_PATH = /^\/(?:es|en)\/library(?:\?[^#]*)?$/;
const HOME_PATH = /^\/(?:es|en)(?:\?[^#]*)?$/;

export function safeReturnPath(value: unknown, fallback: string): string {
  if (typeof value !== "string" || /[\u0000-\u001f\u007f\\]/.test(value)) {
    return fallback;
  }
  if (
    !HOME_PATH.test(value) &&
    !LIBRARY_PATH.test(value) &&
    !TITLE_PATH.test(value)
  ) {
    return fallback;
  }
  const parsed = new URL(value, "https://listae.local");
  if (
    parsed.origin !== "https://listae.local" ||
    !LOCALE_PREFIX.test(parsed.pathname)
  ) {
    return fallback;
  }
  return value;
}
