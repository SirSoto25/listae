const ERROR_MESSAGES: Record<string, string> = {
  Verification:
    "That sign-in link is no longer valid. It may have expired or already been used. Request a new one below.",
  Configuration:
    "Sign-in is temporarily unavailable. Try again in a moment.",
  AccessDenied: "You do not have permission to sign in.",
  Default: "Something went wrong signing in. Request a new magic link below.",
};

export function loginErrorMessage(error?: string | string[]): string | null {
  if (!error) {
    return null;
  }

  const code = Array.isArray(error) ? error[0] : error;
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.Default;
}
