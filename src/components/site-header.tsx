import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

import { LocaleLink } from "@/components/locale-link";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { localePath } from "@/lib/i18n/path";
import { createTranslator } from "@/lib/i18n/t";
import {
  THEME_COOKIE_NAME,
  parseThemePreference,
} from "@/lib/theme-preference";

type SiteHeaderProps = {
  locale: Locale;
  dict: Dictionary;
};

export async function SiteHeader({ locale, dict }: SiteHeaderProps) {
  const t = createTranslator(dict);
  const session = await auth();
  const themePreference = parseThemePreference(
    (await cookies()).get(THEME_COOKIE_NAME)?.value,
  );
  const email = session?.user?.email;

  let username: string | null = null;
  if (email) {
    const [profile] = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    username = profile?.username ?? null;
  }

  return (
    <header className="border-b border-border bg-surface/80 px-6 backdrop-blur">
      <nav
        aria-label={t("nav.mainAria")}
        className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-x-5 gap-y-2 py-3"
      >
        <LocaleLink
          className="text-xl font-black tracking-[-0.05em] text-foreground"
          href="/"
          locale={locale}
        >
          listae<span className="text-accent">.</span>
        </LocaleLink>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-muted">
          <LocaleLink className="hover:text-accent" href="/" locale={locale}>
            {t("nav.search")}
          </LocaleLink>
          {email ? (
            <>
              <LocaleLink
                className="hover:text-accent"
                href="/library"
                locale={locale}
              >
                {t("nav.library")}
              </LocaleLink>
              {username ? (
                <LocaleLink
                  className="hover:text-accent"
                  href={`/u/${username}`}
                  locale={locale}
                >
                  {t("nav.profile")}
                </LocaleLink>
              ) : (
                <LocaleLink
                  className="hover:text-accent"
                  href="/onboarding"
                  locale={locale}
                >
                  {t("nav.finishSetup")}
                </LocaleLink>
              )}
            </>
          ) : null}
          <div className="flex flex-wrap items-center gap-4 border-l border-border pl-4">
            <LocaleSwitcher groupLabel={t("nav.languageGroup")} locale={locale} />
            <ThemeToggle
              initialPreference={themePreference}
              labels={{
                label: t("nav.themeLabel"),
                light: t("nav.themeLight"),
                dark: t("nav.themeDark"),
                system: t("nav.themeSystem"),
              }}
            />
            {email ? (
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: localePath(locale, "/") });
                }}
              >
                <button className="hover:text-accent" type="submit">
                  {t("nav.logout")}
                </button>
              </form>
            ) : (
              <LocaleLink
                className="hover:text-accent"
                href="/login"
                locale={locale}
              >
                {t("nav.login")}
              </LocaleLink>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
