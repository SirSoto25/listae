import type { Locale } from "./config";

const dictionaries = {
  es: () => import("../../../messages/es.json").then((m) => m.default),
  en: () => import("../../../messages/en.json").then((m) => m.default),
} as const;

export type Dictionary = Record<string, unknown>;

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}
