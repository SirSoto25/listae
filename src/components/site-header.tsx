import { eq } from "drizzle-orm";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function SiteHeader() {
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
        <Link
          className="text-xl font-black tracking-[-0.05em] text-foreground"
          href="/"
        >
          listae<span className="text-accent">.</span>
        </Link>
        <div className="flex items-center gap-5 text-sm font-semibold text-muted">
          <Link className="hover:text-accent" href="/">
            Search
          </Link>
          {email ? (
            <>
              <Link className="hover:text-accent" href="/library">
                Library
              </Link>
              {username ? (
                <Link className="hover:text-accent" href={`/u/${username}`}>
                  Profile
                </Link>
              ) : (
                <Link className="hover:text-accent" href="/onboarding">
                  Finish setup
                </Link>
              )}
            </>
          ) : null}
          <div className="flex items-center gap-4 border-l border-border pl-4">
            <ThemeToggle />
            {email ? (
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button className="hover:text-accent" type="submit">
                  Log out
                </button>
              </form>
            ) : (
              <Link className="hover:text-accent" href="/login">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
