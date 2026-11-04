import { describe, expect, it } from "vitest";
import { pageMetadata } from "./page-metadata";

describe("pageMetadata", () => {
  it("returns the localized library title", async () => {
    await expect(pageMetadata("es", "library")).resolves.toEqual({
      title: "Biblioteca",
    });
  });

  it("returns the localized login title", async () => {
    await expect(pageMetadata("en", "login")).resolves.toEqual({
      title: "Sign in",
    });
  });

  it("returns an empty object for an unknown locale", async () => {
    await expect(pageMetadata("fr", "library")).resolves.toEqual({});
  });
});
