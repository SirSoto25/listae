import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  normalizeUsername,
  USERNAME_PATTERN,
} from "@/lib/auth/validation";

type OnboardingPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const [profile] = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(eq(users.email, session.user.email))
    .limit(1);

  if (!profile) {
    redirect("/login");
  }

  if (profile.username) {
    redirect("/library");
  }

  const { error } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16">
      <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-950">
          Choose your username
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          This becomes your public Listae profile URL.
        </p>

        <form
          className="mt-6 space-y-4"
          action={async (formData) => {
            "use server";

            const currentSession = await auth();
            if (!currentSession?.user?.email) {
              redirect("/login");
            }

            const username = normalizeUsername(
              String(formData.get("username") ?? ""),
            );
            if (!USERNAME_PATTERN.test(username)) {
              redirect("/onboarding?error=invalid");
            }

            const [taken] = await db
              .select({ id: users.id })
              .from(users)
              .where(eq(users.username, username))
              .limit(1);

            if (taken) {
              redirect("/onboarding?error=taken");
            }

            await db
              .update(users)
              .set({ username })
              .where(eq(users.email, currentSession.user.email));

            redirect("/library");
          }}
        >
          <label className="block text-sm font-medium text-zinc-800">
            Username
            <input
              className="mt-2 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
              type="text"
              name="username"
              autoComplete="username"
              minLength={3}
              maxLength={32}
              pattern="[a-z0-9_]{3,32}"
              required
            />
          </label>
          <p className="text-xs text-zinc-500">
            3–32 lowercase letters, numbers, or underscores.
          </p>
          {error === "invalid" && (
            <p className="text-sm text-red-700">Enter a valid username.</p>
          )}
          {error === "taken" && (
            <p className="text-sm text-red-700">
              That username is already taken.
            </p>
          )}
          <button
            className="w-full rounded-lg bg-zinc-950 px-4 py-2.5 font-medium text-white hover:bg-zinc-800"
            type="submit"
          >
            Save username
          </button>
        </form>
      </section>
    </main>
  );
}
