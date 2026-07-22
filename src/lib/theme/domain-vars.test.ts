import { describe, expect, it } from "vitest";

import {
  DOMAIN_VARS_END,
  DOMAIN_VARS_START,
  buildDomainVarsBlock,
  parseDomainVarsBlock,
  upsertDomainVarsBlock,
  type DomainVarsInput,
} from "./domain-vars";

const sample: DomainVarsInput = {
  audiovisual: { bg: "#1a2238", accent: "#6b7ae8", fg: "#e8eef9" },
  reading: { bg: "#1c222c", accent: "#7a8a9a", fg: "#e8eef0" },
};

const other: DomainVarsInput = {
  audiovisual: { bg: "#112233", accent: "#445566", fg: "#778899" },
  reading: { bg: "#aabbcc", accent: "#ddeeff", fg: "#123456" },
};

describe("buildDomainVarsBlock", () => {
  it("emits marked block with hex domain CSS variables", () => {
    const block = buildDomainVarsBlock(sample);

    expect(block.startsWith(DOMAIN_VARS_START)).toBe(true);
    expect(block.endsWith(DOMAIN_VARS_END)).toBe(true);
    expect(block).toContain(".listae-domain--audiovisual");
    expect(block).toContain(".listae-domain--reading");
    expect(block).toContain("--listae-domain-bg: #1a2238;");
    expect(block).toContain("--listae-domain-accent: #6b7ae8;");
    expect(block).toContain("--listae-domain-fg: #e8eef9;");
    expect(block).toContain("--listae-domain-bg: #1c222c;");
  });

  it("throws on non-#RRGGBB colors", () => {
    expect(() =>
      buildDomainVarsBlock({
        ...sample,
        audiovisual: { ...sample.audiovisual, bg: "#fff" },
      }),
    ).toThrow();
    expect(() =>
      buildDomainVarsBlock({
        ...sample,
        reading: { ...sample.reading, accent: "red" },
      }),
    ).toThrow();
  });
});

describe("upsertDomainVarsBlock", () => {
  it("prepends block when markers are missing", () => {
    const css = ".listae-profile { color: blue; }\n";
    const result = upsertDomainVarsBlock(css, sample);
    const block = buildDomainVarsBlock(sample);

    expect(result).toBe(`${block}\n\n${css}`);
  });

  it("replaces inclusive marker range and preserves outside CSS", () => {
    const before = "/* keep */\n";
    const after = "\n.listae-entry { margin: 0; }\n";
    const css = `${before}${buildDomainVarsBlock(sample)}${after}`;
    const result = upsertDomainVarsBlock(css, other);

    expect(result.startsWith(before)).toBe(true);
    expect(result.endsWith(after)).toBe(true);
    expect(result).toContain("--listae-domain-bg: #112233;");
    expect(result).not.toContain("#1a2238");
    expect(result).toContain("/* keep */");
    expect(result).toContain(".listae-entry { margin: 0; }");
  });

  it("is idempotent when upserting the same colors twice", () => {
    const css = ".x{}\n";
    const once = upsertDomainVarsBlock(css, sample);
    const twice = upsertDomainVarsBlock(once, sample);

    expect(twice).toBe(once);
  });
});

describe("parseDomainVarsBlock", () => {
  it("parses hex colors from a marked block", () => {
    const css = upsertDomainVarsBlock(".x{}", sample);
    expect(parseDomainVarsBlock(css)).toEqual(sample);
  });

  it("returns null when markers or colors are missing", () => {
    expect(parseDomainVarsBlock(".listae-profile {}")).toBeNull();
    expect(
      parseDomainVarsBlock(
        `${DOMAIN_VARS_START}\n.listae-domain--audiovisual {}\n${DOMAIN_VARS_END}`,
      ),
    ).toBeNull();
  });
});
