import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ signIn: mocks.signIn }));
vi.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

import { requestMagicLink } from "./actions";

function form(email: string, callbackUrl?: string): FormData {
  const data = new FormData();
  data.set("email", email);
  if (callbackUrl !== undefined) data.set("callbackUrl", callbackUrl);
  return data;
}

describe("requestMagicLink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes the email and delegates to signIn", async () => {
    await requestMagicLink("en", form("  ＲＥＡＤＥＲ@Example.com "));
    expect(mocks.signIn).toHaveBeenCalledWith("nodemailer", {
      email: "reader@example.com",
      redirectTo: "/en/library",
    });
  });

  it.each(["", "x(c)@victima.com", '"a"@b.com', "a@@b.com", "a,b@c.com"])(
    "redirects %j to EmailInvalid without calling signIn",
    async (email) => {
      await expect(requestMagicLink("es", form(email))).rejects.toThrow(
        "REDIRECT:/es/login?error=EmailInvalid",
      );
      expect(mocks.signIn).not.toHaveBeenCalled();
    },
  );

  it("leaves rate limiting to the single limit in callbacks.signIn", async () => {
    for (let i = 0; i < 10; i += 1) {
      await requestMagicLink("es", form("reader@example.com"));
    }
    expect(mocks.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.signIn).toHaveBeenCalledTimes(10);
  });

  describe("callbackUrl", () => {
    it("sends the visitor back to the search they came from", async () => {
      await requestMagicLink("es", form("reader@example.com", "/es?q=dune&type=movie"));
      expect(mocks.signIn).toHaveBeenCalledWith("nodemailer", {
        email: "reader@example.com",
        redirectTo: "/es?q=dune&type=movie",
      });
    });

    it.each([
      "https://evil.example/phish",
      "//evil.example",
      "/\\evil.example",
      "javascript:alert(1)",
      "/api/auth/signout",
      "",
    ])("falls back to the library for the unsafe callbackUrl %j", async (url) => {
      await requestMagicLink("es", form("reader@example.com", url));
      expect(mocks.signIn).toHaveBeenCalledWith("nodemailer", {
        email: "reader@example.com",
        redirectTo: "/es/library",
      });
    });

    it("keeps the destination in the EmailInvalid redirect", async () => {
      await expect(
        requestMagicLink("es", form("not-an-email", "/es?q=dune")),
      ).rejects.toThrow(
        "REDIRECT:/es/login?error=EmailInvalid&callbackUrl=%2Fes%3Fq%3Ddune",
      );
    });

    it("does not carry an unsafe destination into the error redirect", async () => {
      await expect(
        requestMagicLink("es", form("not-an-email", "https://evil.example")),
      ).rejects.toThrow("REDIRECT:/es/login?error=EmailInvalid");
      expect(mocks.signIn).not.toHaveBeenCalled();
    });
  });
});
