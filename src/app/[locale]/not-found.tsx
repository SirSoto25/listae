import type { Metadata } from "next";

import { LocaleLink } from "@/components/locale-link";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { requestLocale } from "@/lib/i18n/request-locale";
import { createTranslator } from "@/lib/i18n/t";

// not-found.tsx receives no params, so the locale comes from the request.
export async function generateMetadata(): Promise<Metadata> {
  const t = createTranslator(await getDictionary(await requestLocale()));
  return { title: t("status.notFoundTitle") };
}

export default async function LocaleNotFound() {
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
        <LocaleLink
          className="mt-8 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:opacity-90"
          href="/"
          locale={locale}
        >
          {t("status.backHome")}
        </LocaleLink>
      </section>
    </main>
  );
}
