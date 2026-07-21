import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { auth, signIn } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user?.email) {
    const [profile] = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    redirect(profile?.username ? "/library" : "/onboarding");
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16">
      <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-zinc-950">Sign in to Listae</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Enter your email and we&apos;ll send you a one-time sign-in link.
        </p>

        <form
          className="mt-6 space-y-4"
          action={async (formData) => {
            "use server";

            await signIn("nodemailer", {
              email: formData.get("email"),
              callbackUrl: "/library",
            });
          }}
        >
          <label className="block text-sm font-medium text-zinc-800">
            Email
            <input
              className="mt-2 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-950 outline-none focus:border-zinc-950"
              type="email"
              name="email"
              autoComplete="email"
              required
            />
          </label>
          <button
            className="w-full rounded-lg bg-zinc-950 px-4 py-2.5 font-medium text-white hover:bg-zinc-800"
            type="submit"
          >
            Email me a magic link
          </button>
        </form>

        <p className="mt-5 text-xs leading-5 text-zinc-500">
          Check server console for the magic link in local dev.
        </p>
      </section>
    </main>
  );
}
