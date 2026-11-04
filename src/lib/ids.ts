const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when `value` is a hyphenated UUID (the format used for work ids). */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
