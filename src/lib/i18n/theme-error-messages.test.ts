import { describe, expect, it } from "vitest";

import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import { THEME_ERROR_CODES } from "../theme/validate-css";

describe("theme error messages", () => {
  for (const [name, dict] of [
    ["es", es],
    ["en", en],
  ] as const) {
    it(`has a non-empty ${name} message for every theme error code`, () => {
      const errors = dict.customize.errors as Record<string, string>;
      for (const code of THEME_ERROR_CODES) {
        expect(errors[code]?.trim(), code).toBeTruthy();
      }
    });
  }

  it("uses the same placeholders in es and en", () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    const e = en.customize.errors as Record<string, string>;
    const s = es.customize.errors as Record<string, string>;
    for (const code of THEME_ERROR_CODES) {
      expect(ph(s[code]), code).toEqual(ph(e[code]));
    }
  });
});
