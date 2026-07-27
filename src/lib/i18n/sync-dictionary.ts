import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import type { Locale } from "./config";
import type { Dictionary } from "./get-dictionary";
import { createTranslator } from "./t";

const dictionaries: Record<Locale, Dictionary> = { es, en };

export function syncDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export function syncTranslator(locale: Locale) {
  return createTranslator(dictionaries[locale]);
}
