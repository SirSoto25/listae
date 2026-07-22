import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { auth, signIn } from "@/lib/auth";
import { loginErrorMessage } from "@/lib/auth/login-messages";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

type LoginPageProps = {
  searchParams: Promise<{ error?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  const { error } = await searchParams;
  const errorMessage = loginErrorMessage(error);

  if (session?.user?.email) {
    const [profile] = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    redirect(profile?.username ? "/library" : "/onboarding");
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-[#f7f5f0] px-6 py-16">
      <section className="w-full max-w-md border border-stone-200 bg-white p-8">
        <h1 className="text-2xl font-black tracking-tight text-stone-950">
          Sign in to Listae
        </h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Enter your email and we&apos;ll send you a one-time sign-in link. No
          password needed.
        </p>

        {errorMessage ? (
          <p
            className="mt-4 border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-950"
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
              callbackUrl: "/library",
            });
          }}
        >
          <label className="block text-sm font-bold text-stone-800">
            Email
            <input
              className="mt-2 block w-full border border-stone-300 bg-white px-3 py-2 text-stone-950 outline-none focus:border-stone-950"
              type="email"
              name="email"
              autoComplete="email"
              required
            />
          </label>
          <button
            className="w-full bg-stone-950 px-4 py-2.5 font-bold text-white hover:bg-stone-800"
            type="submit"
          >
            {errorMessage ? "Send a new magic link" : "Email me a magic link"}
          </button>
        </form>

        <p className="mt-5 text-xs leading-5 text-stone-500">
          Locally, open the Next.js terminal and look for{" "}
          <code className="rounded bg-stone-100 px-1 py-0.5">
            [listae magic link]
          </code>
          . Links expire and can only be used once.
        </p>
      </section>
    </main>
  );
}
