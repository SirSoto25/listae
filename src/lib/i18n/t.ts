import type { Dictionary } from "./get-dictionary";

function lookup(dict: Dictionary, key: string): string | undefined {
  const parts = key.split(".");
  let node: unknown = dict;
  for (const part of parts) {
    if (typeof node !== "object" || node === null || !(part in node)) {
      return undefined;
    }
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

export function createTranslator(dict: Dictionary) {
  return function t(
    key: string,
    params?: Record<string, string | number>,
  ): string {
    const template = lookup(dict, key) ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (_, name: string) =>
      String(params[name] ?? `{${name}}`),
    );
  };
}
