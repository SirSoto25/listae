import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ThemeEditor } from "@/components/theme-editor";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { listLibraryEntries, rowsToProfileEntries } from "@/lib/lists/entries";
import { DEFAULT_CSS, DEFAULT_HTML_TEMPLATE } from "@/lib/theme/defaults";
import { ensureProfileTheme } from "@/lib/theme/store";

type CustomizeProfilePageProps = {
  params: Promise<{ username: string }>;
};

export default async function CustomizeProfilePage({
  params,
}: CustomizeProfilePageProps) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const { username } = await params;
  const user = await db.query.users.findFirst({
    columns: { id: true, username: true, displayName: true },
    where: eq(users.email, session.user.email),
  });
  if (!user?.username) {
    redirect("/onboarding");
  }
  if (user.username !== username) {
    notFound();
  }

  const [theme, rows] = await Promise.all([
    ensureProfileTheme(user.id),
    listLibraryEntries(user.id),
  ]);
  const entries = rowsToProfileEntries(rows);

  return (
    <main className="flex-1 bg-transparent px-6 py-10 text-foreground">
      <div className="mx-auto max-w-[96rem]">
        <header className="mb-8 flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-accent">
              @{user.username}
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">
              Customize profile
            </h1>
            <p className="mt-2 max-w-2xl text-muted">
              Edit your safe HTML template and CSS, then review it in the
              script-free preview.
            </p>
          </div>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-surface px-5 text-sm font-black text-foreground hover:border-accent hover:text-accent"
            href={`/u/${user.username}`}
          >
            View public profile
          </Link>
        </header>

        <ThemeEditor
          username={user.username}
          displayName={user.displayName ?? user.username}
          entries={entries}
          initialHtmlTemplate={theme.htmlTemplate}
          initialCustomCss={theme.customCss}
          defaultHtmlTemplate={DEFAULT_HTML_TEMPLATE}
          defaultCustomCss={DEFAULT_CSS}
        />
      </div>
    </main>
  );
}

