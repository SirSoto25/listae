import type { Metadata } from "next";

import { isLocale } from "./config";
import { getDictionary } from "./get-dictionary";
import { createTranslator } from "./t";

export type PageMetadataKey =
  | "login"
  | "verify"
  | "onboarding"
  | "library"
  | "customize";

/**
 * Title for a static page. The "%s · Listae" template is applied by the
 * [locale] layout, so only the page part is returned here.
 */
export async function pageMetadata(
  locale: string,
  key: PageMetadataKey,
): Promise<Metadata> {
  // The layout calls notFound() for unknown locales; keep metadata empty.
  if (!isLocale(locale)) return {};
  const t = createTranslator(await getDictionary(locale));
  return { title: t(`meta.pages.${key}`) };
}
