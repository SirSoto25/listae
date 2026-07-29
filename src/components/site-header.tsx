import { eq } from "drizzle-orm";

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

type SiteHeaderProps = {
  locale: Locale;
  dict: Dictionary;
};

export async function SiteHeader({ locale, dict }: SiteHeaderProps) {
  const t = createTranslator(dict);
  const session = await auth();
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
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between">
        <LocaleLink
          className="text-xl font-black tracking-[-0.05em] text-foreground"
          href="/"
          locale={locale}
        >
          listae<span className="text-accent">.</span>
        </LocaleLink>
        <div className="flex items-center gap-5 text-sm font-semibold text-muted">
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
          <div className="flex items-center gap-4 border-l border-border pl-4">
            <LocaleSwitcher locale={locale} />
            <ThemeToggle />
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
