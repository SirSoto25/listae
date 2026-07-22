import { expect, it } from "vitest";

import { authConfig } from "./config";

it("allows the initial email verification request before a user exists", async () => {
  const result = await authConfig.callbacks.signIn({
    user: { email: "new-user@example.com" },
    account: null,
    profile: undefined,
    email: { verificationRequest: true },
    credentials: undefined,
  });

  expect(result).toBe(true);
});

it("allows Auth.js to create a session for a newly verified user", async () => {
  const result = await authConfig.callbacks.signIn({
    user: { email: "new-user@example.com" },
    account: null,
    profile: undefined,
    email: undefined,
    credentials: undefined,
  });

  expect(result).toBe(true);
});

it("allows sign-in before the adapter has inserted the new user", async () => {
  const result = await authConfig.callbacks.signIn({
    user: { id: "pending-user", email: "pending-user@example.com" },
    account: null,
    profile: undefined,
    email: undefined,
    credentials: undefined,
  });

  expect(result).toBe(true);
});

it("keeps same-origin post-login callbacks intact", async () => {
  const result = await authConfig.callbacks.redirect({
    url: "http://localhost:3000/library",
    baseUrl: "http://localhost:3000",
  });

  expect(result).toBe("http://localhost:3000/library");
});

it("rejects external redirect targets", async () => {
  const result = await authConfig.callbacks.redirect({
    url: "https://evil.example/phish",
    baseUrl: "http://localhost:3000",
  });

  expect(result).toBe("http://localhost:3000");
});

it("points Auth.js at custom sign-in and verify pages", () => {
  expect(authConfig.pages).toEqual({
    signIn: "/login",
    verifyRequest: "/login/verify",
    error: "/login",
  });
});
