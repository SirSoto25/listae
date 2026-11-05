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

function form(email: string): FormData {
  const data = new FormData();
  data.set("email", email);
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
});
