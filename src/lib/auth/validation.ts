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
