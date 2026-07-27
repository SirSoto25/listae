import { describe, expect, it } from "vitest";
import { createTranslator } from "./t";

describe("createTranslator", () => {
  const t = createTranslator({ nav: { search: "Buscar" } });

  it("resolves dot keys", () => {
    expect(t("nav.search")).toBe("Buscar");
  });

  it("interpolates params", () => {
    const t2 = createTranslator({ greet: "Hola {name}" });
    expect(t2("greet", { name: "Ana" })).toBe("Hola Ana");
  });

  it("returns key when missing", () => {
    expect(t("missing.key")).toBe("missing.key");
  });
});
