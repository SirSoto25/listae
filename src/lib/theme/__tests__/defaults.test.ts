import { describe, expect, it } from "vitest";

import en from "../../../../messages/en.json";
import es from "../../../../messages/es.json";
import { DEFAULT_CSS } from "../defaults";
import { parseDomainVarsBlock } from "../domain-vars";

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * channel(r!) + 0.7152 * channel(g!) + 0.0722 * channel(b!);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

/** `color-mix(in srgb, a p%, b)` as the default theme uses it for striping. */
function mix(a: string, b: string, weightOfA: number): string {
  const part = (hex: string, i: number) => parseInt(hex.slice(i, i + 2), 16);
  return (
    "#" +
    [1, 3, 5]
      .map((i) =>
        Math.round(part(a, i) * weightOfA + part(b, i) * (1 - weightOfA))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

describe("default theme contrast (WCAG AA 4.5:1)", () => {
  const vars = parseDomainVarsBlock(DEFAULT_CSS)!;
  const PAGE_BG = "#111827";
  const MUTED = "#9ca3af";

  it.each(["audiovisual", "reading"] as const)(
    "keeps %s text legible on both striped row backgrounds",
    (domain) => {
      const { bg, accent, fg } = vars[domain];
      const evenRow = mix(bg, PAGE_BG, 0.7);

      for (const background of [bg, evenRow]) {
        expect(contrast(accent, background), "accent (titles, hover)").toBeGreaterThanOrEqual(4.5);
        expect(contrast(fg, background), "foreground").toBeGreaterThanOrEqual(4.5);
        expect(contrast(MUTED, background), "muted text").toBeGreaterThanOrEqual(4.5);
      }
    },
  );

  it("keeps muted text legible on the page background", () => {
    expect(contrast(MUTED, PAGE_BG)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("profile messages", () => {
  const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();

  it("defines the new profile keys with the same placeholders in es and en", () => {
    for (const dict of [es, en]) {
      expect(dict.profile.domain.audiovisual.trim()).toBeTruthy();
      expect(dict.profile.domain.reading.trim()).toBeTruthy();
      expect(dict.profile.unit.episodes.trim()).toBeTruthy();
      expect(dict.profile.unit.chapters.trim()).toBeTruthy();
      expect(dict.profile.unit.pages.trim()).toBeTruthy();
      expect(dict.profile.table.cover.trim()).toBeTruthy();
    }
    for (const key of ["episodes", "chapters", "pages"] as const) {
      expect(placeholders(es.profile.unit[key])).toEqual(
        placeholders(en.profile.unit[key]),
      );
    }
  });

  it("documents the heading placeholders in the editor help", () => {
    for (const dict of [es, en]) {
      expect(dict.customize.htmlTemplateHelp).toContain("{{audiovisual_heading}}");
      expect(dict.customize.htmlTemplateHelp).toContain("{{reading_heading}}");
    }
  });
});
