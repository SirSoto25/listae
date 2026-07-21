const TITLE_PATH =
  /^\/title\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?:\?[^#]*)?$/i;
const LIBRARY_PATH = /^\/library(?:\?[^#]*)?$/;

export function safeReturnPath(value: unknown, fallback: string): string {
  if (
    typeof value !== "string" ||
    /[\u0000-\u001f\u007f\\]/.test(value) ||
    (!LIBRARY_PATH.test(value) && !TITLE_PATH.test(value))
  ) {
    return fallback;
  }

  const parsed = new URL(value, "https://listae.local");
  return parsed.origin === "https://listae.local" ? value : fallback;
}
