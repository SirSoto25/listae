import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { profileThemes, users } from "@/lib/db/schema";
import { listLibraryEntries, rowsToProfileEntries } from "@/lib/lists/entries";
import { DEFAULT_CSS, DEFAULT_HTML_TEMPLATE } from "@/lib/theme/defaults";
import { renderTheme } from "@/lib/theme/render";
import { buildThemeDocument } from "@/lib/theme/save";

type PublicProfilePageProps = {
  params: Promise<{ username: string }>;
};

export default async function PublicProfilePage({
  params,
}: PublicProfilePageProps) {
  const { username } = await params;
  const user = await db.query.users.findFirst({
    columns: { id: true, username: true, displayName: true },
    where: eq(users.username, username),
  });
  if (!user?.username) {
    notFound();
  }

  const [rows, storedTheme] = await Promise.all([
    listLibraryEntries(user.id),
    db.query.profileThemes.findFirst({
      where: eq(profileThemes.userId, user.id),
    }),
  ]);
  const entries = rowsToProfileEntries(rows);
  const activeTheme = storedTheme ?? {
    htmlTemplate: DEFAULT_HTML_TEMPLATE,
    customCss: DEFAULT_CSS,
  };
  let rendered = renderTheme({
    template: activeTheme.htmlTemplate,
    css: activeTheme.customCss,
    username: user.username,
    displayName: user.displayName ?? user.username,
    entries,
  });
  if (!rendered.ok) {
    rendered = renderTheme({
      template: DEFAULT_HTML_TEMPLATE,
      css: DEFAULT_CSS,
      username: user.username,
      displayName: user.displayName ?? user.username,
      entries,
    });
  }
  if (!rendered.ok) {
    throw new Error("default profile theme is invalid");
  }

  return (
    <main className="flex flex-1 bg-white">
      <iframe
        sandbox=""
        title={`${user.displayName ?? user.username}'s Listae profile`}
        srcDoc={buildThemeDocument(rendered.html, rendered.css)}
        className="min-h-[calc(100vh-4rem)] w-full border-0"
      />
    </main>
  );
}

