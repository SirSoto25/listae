export const USERNAME_PATTERN = /^[a-z0-9_]{3,32}$/;

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function displayNameFromEmail(email: string) {
  return email.split("@", 1)[0];
}
