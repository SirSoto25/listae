import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import { auth, signIn } from "@/lib/auth";
import { loginErrorMessage } from "@/lib/auth/login-messages";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localePath } from "@/lib/i18n/path";
import { createTranslator } from "@/lib/i18n/t";

type LoginPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string | string[] }>;
};

export default async function LoginPage({
  params,
  searchParams,
}: LoginPageProps) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dict = await getDictionary(locale);
  const t = createTranslator(dict);

  const session = await auth();
  const { error } = await searchParams;
  const errorMessage = loginErrorMessage(error);

  if (session?.user?.email) {
    const [profile] = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    redirect(
      localePath(locale, profile?.username ? "/library" : "/onboarding"),
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-transparent px-6 py-16">
      <section className="w-full max-w-md rounded-[length:var(--radius-panel)] border border-border bg-surface p-8">
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          {t("auth.loginTitle")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          {t("auth.loginSubtitle")}
        </p>

        {errorMessage ? (
          <p
            className="mt-4 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-sm leading-6 text-foreground"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}

        <form
          className="mt-6 space-y-4"
          action={async (formData) => {
            "use server";

            await signIn("nodemailer", {
              email: formData.get("email"),
              callbackUrl: localePath(locale, "/library"),
            });
          }}
        >
          <label className="block text-sm font-bold text-foreground">
            {t("auth.emailLabel")}
            <input
              className="mt-2 block w-full rounded-[length:var(--radius-control)] border border-border bg-surface px-3 py-2 text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/20"
              type="email"
              name="email"
              autoComplete="email"
              required
            />
          </label>
          <button
            className="w-full rounded-[length:var(--radius-control)] bg-primary px-4 py-2.5 font-bold text-primary-foreground hover:opacity-90"
            type="submit"
          >
            {errorMessage
              ? t("auth.sendNewMagicLink")
              : t("auth.sendMagicLink")}
          </button>
        </form>

        <p className="mt-5 text-xs leading-5 text-muted">
          {t("auth.loginFooter")}
        </p>
      </section>
    </main>
  );
}
