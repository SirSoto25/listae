import type { Metadata } from "next";

import { getDictionary } from "@/lib/i18n/get-dictionary";
import { requestLocale } from "@/lib/i18n/request-locale";
import { createTranslator } from "@/lib/i18n/t";

// Root fallback for URLs that match no route at all (e.g. /es/foo/bar). It
// renders inside the root layout only, so there is no SiteHeader or LocaleLink
// here; the locale comes from the request, like `<html lang>`.
export async function generateMetadata(): Promise<Metadata> {
  const t = createTranslator(await getDictionary(await requestLocale()));
  return { title: t("status.notFoundTitle") };
}

export default async function RootNotFound() {
  const locale = await requestLocale();
  const t = createTranslator(await getDictionary(locale));

  return (
    <main className="flex flex-1 items-center justify-center bg-transparent px-6 py-16">
      <section className="w-full max-w-md rounded-[length:var(--radius-panel)] border border-border bg-surface p-8">
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          {t("status.notFoundTitle")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          {t("status.notFoundBody")}
        </p>
        <a
          className="mt-8 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:opacity-90"
          href={`/${locale}`}
        >
          {t("status.backHome")}
        </a>
      </section>
    </main>
  );
}
