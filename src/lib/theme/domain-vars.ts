export type DomainColorVars = {
  bg: string;
  accent: string;
  fg: string;
};

export type DomainVarsInput = {
  audiovisual: DomainColorVars;
  reading: DomainColorVars;
};

export const DOMAIN_VARS_START = "/* listae:domain-vars:start */";
export const DOMAIN_VARS_END = "/* listae:domain-vars:end */";

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function assertHex(value: string, label: string): string {
  if (!HEX_COLOR.test(value)) {
    throw new Error(`Invalid domain color for ${label}: expected #RRGGBB`);
  }
  return value;
}

function assertDomainColors(
  colors: DomainColorVars,
  domain: "audiovisual" | "reading",
): DomainColorVars {
  return {
    bg: assertHex(colors.bg, `${domain}.bg`),
    accent: assertHex(colors.accent, `${domain}.accent`),
    fg: assertHex(colors.fg, `${domain}.fg`),
  };
}

function formatDomainRule(
  domain: "audiovisual" | "reading",
  colors: DomainColorVars,
): string {
  const safe = assertDomainColors(colors, domain);
  return [
    `.listae-domain--${domain} {`,
    `  --listae-domain-bg: ${safe.bg};`,
    `  --listae-domain-accent: ${safe.accent};`,
    `  --listae-domain-fg: ${safe.fg};`,
    `}`,
  ].join("\n");
}

export function buildDomainVarsBlock(input: DomainVarsInput): string {
  return [
    DOMAIN_VARS_START,
    formatDomainRule("audiovisual", input.audiovisual),
    "",
    formatDomainRule("reading", input.reading),
    DOMAIN_VARS_END,
  ].join("\n");
}

export function upsertDomainVarsBlock(
  css: string,
  input: DomainVarsInput,
): string {
  const block = buildDomainVarsBlock(input);
  const start = css.indexOf(DOMAIN_VARS_START);
  const end = css.indexOf(DOMAIN_VARS_END);

  if (start !== -1 && end !== -1 && end > start) {
    const before = css.slice(0, start);
    const after = css.slice(end + DOMAIN_VARS_END.length);
    return `${before}${block}${after}`;
  }

  return `${block}\n\n${css}`;
}

function parseDomainColors(
  block: string,
  domain: "audiovisual" | "reading",
): DomainColorVars | null {
  const ruleRe = new RegExp(
    `\\.listae-domain--${domain}\\s*\\{([^}]*)\\}`,
    "s",
  );
  const ruleMatch = block.match(ruleRe);
  if (!ruleMatch) return null;

  const body = ruleMatch[1];
  const pick = (prop: string): string | null => {
    const m = body.match(
      new RegExp(`--listae-domain-${prop}\\s*:\\s*(#[0-9a-fA-F]{6})\\s*;`),
    );
    return m?.[1] ?? null;
  };

  const bg = pick("bg");
  const accent = pick("accent");
  const fg = pick("fg");
  if (!bg || !accent || !fg) return null;
  return { bg, accent, fg };
}

export function parseDomainVarsBlock(css: string): DomainVarsInput | null {
  const start = css.indexOf(DOMAIN_VARS_START);
  const end = css.indexOf(DOMAIN_VARS_END);
  if (start === -1 || end === -1 || end <= start) return null;

  const block = css.slice(start, end + DOMAIN_VARS_END.length);
  const audiovisual = parseDomainColors(block, "audiovisual");
  const reading = parseDomainColors(block, "reading");
  if (!audiovisual || !reading) return null;
  return { audiovisual, reading };
}
