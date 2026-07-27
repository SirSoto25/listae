import { notFound } from "next/navigation";

import { LocaleLink } from "@/components/locale-link";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { createTranslator } from "@/lib/i18n/t";

type LoginVerifyPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function LoginVerifyPage({
  params,
}: LoginVerifyPageProps) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dict = await getDictionary(locale);
  const t = createTranslator(dict);

  return (
    <main className="flex flex-1 items-center justify-center bg-transparent px-6 py-16">
      <section className="w-full max-w-md rounded-[length:var(--radius-panel)] border border-border bg-surface p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
          {t("auth.verifyEyebrow")}
        </p>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-foreground">
          {t("auth.verifyTitle")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          {t("auth.verifyBody")}
        </p>
        <p className="mt-4 text-sm leading-6 text-muted">
          {t("auth.verifyDevHint")}
        </p>
        <div className="mt-8 flex flex-col gap-3 text-sm font-bold">
          <LocaleLink
            className="text-accent hover:opacity-90"
            href="/login"
            locale={locale}
          >
            {t("auth.differentEmail")}
          </LocaleLink>
          <LocaleLink
            className="text-muted hover:text-foreground"
            href="/"
            locale={locale}
          >
            {t("auth.backToSearch")}
          </LocaleLink>
        </div>
      </section>
    </main>
  );
}
