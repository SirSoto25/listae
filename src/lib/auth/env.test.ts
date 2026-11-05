import { describe, expect, it } from "vitest";

import { AUTH_SECRET_PLACEHOLDER, validateAuthEnv } from "./env";

// `openssl rand -base64 32`: 44 characters, 32 random bytes.
const STRONG_SECRET = "q3Jr8vX0b5mK2pT7wY1zN4cF6hL9sD0aG3eR5uI8oP4=";

const PRODUCTION = {
  NODE_ENV: "production",
  AUTH_SECRET: STRONG_SECRET,
  AUTH_URL: "https://listae.example",
  EMAIL_SERVER: "smtp://user:pass@smtp.listae.example:587",
} as const;

describe("validateAuthEnv in production", () => {
  it("returns the secret when everything is configured", () => {
    expect(validateAuthEnv({ ...PRODUCTION })).toEqual({
      secret: STRONG_SECRET,
      warnings: [],
    });
  });

  it("requires AUTH_SECRET", () => {
    expect(() =>
      validateAuthEnv({ ...PRODUCTION, AUTH_SECRET: "  " }),
    ).toThrow(/AUTH_SECRET/);
  });

  it("rejects the placeholder secret from .env.example", () => {
    expect(() =>
      validateAuthEnv({ ...PRODUCTION, AUTH_SECRET: AUTH_SECRET_PLACEHOLDER }),
    ).toThrow(/AUTH_SECRET.*\.env\.example/);
  });

  it("rejects a secret shorter than 32 bytes of entropy", () => {
    // 32 hex characters are only 16 random bytes.
    expect(() =>
      validateAuthEnv({
        ...PRODUCTION,
        AUTH_SECRET: "0123456789abcdef0123456789abcdef",
      }),
    ).toThrow(/AUTH_SECRET.*32 bytes/);
  });

  it("rejects a long but repetitive secret", () => {
    expect(() =>
      validateAuthEnv({ ...PRODUCTION, AUTH_SECRET: "a".repeat(64) }),
    ).toThrow(/AUTH_SECRET/);
  });

  it("accepts a 64-character hex secret (openssl rand -hex 32)", () => {
    const hex = "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";
    expect(validateAuthEnv({ ...PRODUCTION, AUTH_SECRET: hex }).secret).toBe(
      hex,
    );
  });

  it("requires AUTH_URL", () => {
    expect(() => validateAuthEnv({ ...PRODUCTION, AUTH_URL: "" })).toThrow(
      /AUTH_URL/,
    );
  });

  it("requires AUTH_URL to use https", () => {
    expect(() =>
      validateAuthEnv({ ...PRODUCTION, AUTH_URL: "http://listae.example" }),
    ).toThrow(/AUTH_URL.*https/);
  });

  it("rejects AUTH_TRUST_HOST without AUTH_URL", () => {
    expect(() =>
      validateAuthEnv({
        ...PRODUCTION,
        AUTH_URL: undefined,
        AUTH_TRUST_HOST: "true",
      }),
    ).toThrow(/AUTH_TRUST_HOST.*AUTH_URL/);
  });

  it("requires EMAIL_SERVER", () => {
    expect(() =>
      validateAuthEnv({ ...PRODUCTION, EMAIL_SERVER: undefined }),
    ).toThrow(/EMAIL_SERVER/);
  });
});

describe("validateAuthEnv in development", () => {
  const DEV = {
    NODE_ENV: "development",
    AUTH_SECRET: AUTH_SECRET_PLACEHOLDER,
    AUTH_URL: "http://localhost:3000",
  } as const;

  it("keeps working with a copied .env.example, with a warning", () => {
    const result = validateAuthEnv({ ...DEV });
    expect(result.secret).toBe(AUTH_SECRET_PLACEHOLDER);
    expect(result.warnings.join("\n")).toMatch(/AUTH_SECRET/);
  });

  it("still requires AUTH_SECRET", () => {
    expect(() => validateAuthEnv({ ...DEV, AUTH_SECRET: undefined })).toThrow(
      /AUTH_SECRET/,
    );
  });

  it("still rejects AUTH_TRUST_HOST without AUTH_URL", () => {
    expect(() =>
      validateAuthEnv({ ...DEV, AUTH_URL: undefined, AUTH_TRUST_HOST: "1" }),
    ).toThrow(/AUTH_TRUST_HOST/);
  });

  it("rejects an AUTH_URL that is not an absolute http(s) URL", () => {
    expect(() =>
      validateAuthEnv({ ...DEV, AUTH_URL: "javascript:alert(1)" }),
    ).toThrow(/AUTH_URL/);
  });
});
