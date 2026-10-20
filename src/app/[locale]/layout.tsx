import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { createTranslator } from "@/lib/i18n/t";

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  // The layout below calls notFound() for unknown locales.
  if (!isLocale(locale)) return {};
  const t = createTranslator(await getDictionary(locale));

  return {
    // `absolute` skips the root layout's "%s · Listae" template so the home
    // title isn't suffixed twice; `template` titles every page beneath this.
    title: { absolute: t("meta.title"), template: "%s · Listae" },
    description: t("meta.description"),
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dict = await getDictionary(locale);

  return (
    <>
      <SiteHeader locale={locale} dict={dict} />
      {children}
    </>
  );
}
