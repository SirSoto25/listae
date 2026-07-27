import { describe, expect, it } from "vitest";

import { resolveLocaleFromAuthUrl } from "./locale-from-url";

describe("resolveLocaleFromAuthUrl", () => {
  it("reads locale from callbackUrl query param", () => {
    expect(
      resolveLocaleFromAuthUrl(
        "http://localhost:3000/api/auth/callback/nodemailer?callbackUrl=%2Fes%2Flibrary&token=abc",
      ),
    ).toBe("es");
    expect(
      resolveLocaleFromAuthUrl(
        "http://localhost:3000/api/auth/callback/nodemailer?callbackUrl=%2Fen%2Flibrary&token=abc",
      ),
    ).toBe("en");
  });

  it("defaults to es when callbackUrl lacks locale prefix", () => {
    expect(
      resolveLocaleFromAuthUrl(
        "http://localhost:3000/api/auth/callback/nodemailer?callbackUrl=%2Flibrary&token=abc",
      ),
    ).toBe("es");
  });
});
