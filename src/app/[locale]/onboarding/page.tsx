import { and, eq, isNull } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import { SubmitButton } from "@/components/submit-button";
import { UsernameField } from "@/components/username-field";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { normalizeUsername, USERNAME_PATTERN } from "@/lib/auth/validation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { usernameFieldLabels } from "@/lib/i18n/labels";
import { localePath } from "@/lib/i18n/path";
import { createTranslator } from "@/lib/i18n/t";

type OnboardingPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function OnboardingPage({
  params,
  searchParams,
}: OnboardingPageProps) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dict = await getDictionary(locale);
  const t = createTranslator(dict);

  const session = await auth();

  if (!session?.user?.email) {
    redirect(localePath(locale, "/login"));
  }

  const [profile] = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(eq(users.email, session.user.email))
    .limit(1);

  if (!profile) {
    redirect(localePath(locale, "/login"));
  }

  if (profile.username) {
    redirect(localePath(locale, "/library"));
  }

  const { error } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center bg-transparent px-6 py-16">
      <section className="w-full max-w-md rounded-[length:var(--radius-panel)] border border-border bg-surface p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-foreground">
          {t("onboarding.title")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          {t("onboarding.subtitle")}
        </p>

        <form
          className="mt-6 space-y-4"
          action={async (formData) => {
            "use server";

            const currentSession = await auth();
            if (!currentSession?.user?.email) {
              redirect(localePath(locale, "/login"));
            }

            const username = normalizeUsername(
              String(formData.get("username") ?? ""),
            );
            if (!USERNAME_PATTERN.test(username)) {
              redirect(localePath(locale, "/onboarding?error=invalid"));
            }

            const [taken] = await db
              .select({ id: users.id })
              .from(users)
              .where(eq(users.username, username))
              .limit(1);

            if (taken) {
              redirect(localePath(locale, "/onboarding?error=taken"));
            }

            let claimed = true;
            try {
              // isNull guard: an onboarded user can't re-POST to rename and
              // free their old handle for someone else.
              await db
                .update(users)
                .set({
                  username,
                  displayName: username,
                  profileLocale: locale,
                })
                .where(
                  and(
                    eq(users.email, currentSession.user.email),
                    isNull(users.username),
                  ),
                );
            } catch {
              // users_username_unique: lost a race for the same handle.
              claimed = false;
            }
            if (!claimed) {
              redirect(localePath(locale, "/onboarding?error=taken"));
            }

            redirect(localePath(locale, "/library"));
          }}
        >
          <UsernameField
            email={session.user.email}
            labels={usernameFieldLabels(t)}
          />
          {error === "invalid" && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {t("onboarding.errorInvalid")}
            </p>
          )}
          {error === "taken" && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {t("onboarding.errorTaken")}
            </p>
          )}
          <SubmitButton className="w-full rounded-[length:var(--radius-control)] bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:opacity-90">
            {t("onboarding.saveUsername")}
          </SubmitButton>
        </form>
      </section>
    </main>
  );
}
