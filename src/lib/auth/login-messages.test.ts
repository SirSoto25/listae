import { describe, expect, it } from "vitest";

import { loginErrorMessage } from "./login-messages";

it("returns Spanish verification error when locale es", () => {
  expect(loginErrorMessage("Verification", "es")).toMatch(/enlace|correo/i);
});

it("explains expired or reused verification links in Spanish by default", () => {
  expect(loginErrorMessage("Verification")).toMatch(/enlace|válido/i);
});

it("explains expired or reused verification links in English explicitly", () => {
  expect(loginErrorMessage("Verification", "en")).toMatch(/no longer valid/i);
});

it("falls back for unknown Auth.js error codes", () => {
  expect(loginErrorMessage("SomethingWeird", "en")).toMatch(/new magic link/i);
});

it("returns null when there is no error", () => {
  expect(loginErrorMessage(undefined)).toBeNull();
});
