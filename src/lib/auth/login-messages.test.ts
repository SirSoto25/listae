import { expect, it } from "vitest";

import { loginErrorMessage } from "./login-messages";

it("explains expired or reused verification links", () => {
  expect(loginErrorMessage("Verification")).toMatch(/no longer valid/i);
});

it("falls back for unknown Auth.js error codes", () => {
  expect(loginErrorMessage("SomethingWeird")).toMatch(/new magic link/i);
});

it("returns null when there is no error", () => {
  expect(loginErrorMessage(undefined)).toBeNull();
});
