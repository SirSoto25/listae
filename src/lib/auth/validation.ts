export const USERNAME_PATTERN = /^[a-z0-9_]{3,32}$/;

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function emailLocalPart(email: string): string {
  return email.split("@", 1)[0] ?? "";
}

export function usernameMatchesEmailLocalPart(
  username: string,
  email: string,
): boolean {
  return (
    normalizeUsername(username) ===
    emailLocalPart(email).trim().toLowerCase()
  );
}

/**
 * Canonical form of a sign-in email: NFKC first (so homoglyphs such as the
 * fullwidth `＠` become the ASCII characters a mail parser would see), then
 * trimmed and lowercased.
 */
export function normalizeEmail(raw: string): string {
  return raw.normalize("NFKC").trim().toLowerCase();
}

const LOCAL_PART =
  /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/i;
const DOMAIN_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

/**
 * A deliberately narrow subset of RFC 5321 for magic-link addresses: one
 * `@`, a dot-atom local part (no quotes, comments, spaces, `<>`, `;` or
 * commas, which mail parsers may read as extra recipients) and an ASCII
 * domain with at least two labels. Expects `normalizeEmail` output.
 */
export function isStrictEmail(email: string): boolean {
  if (email.length > 254) return false;
  const parts = email.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || local.length > 64 || !LOCAL_PART.test(local)) return false;
  const labels = domain.split(".");
  return labels.length >= 2 && labels.every((label) => DOMAIN_LABEL.test(label));
}
