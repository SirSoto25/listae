"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import type { Locale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/path";

type Props = Omit<ComponentProps<typeof Link>, "href"> & {
  locale: Locale;
  href: string;
};

export function LocaleLink({ locale, href, ...rest }: Props) {
  const resolved =
    href.startsWith("/u/") || href.startsWith("http") ? href : localePath(locale, href);
  return <Link href={resolved} {...rest} />;
}
