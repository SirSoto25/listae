import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { db } from "@/lib/db";
import { profileThemes, users } from "@/lib/db/schema";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { createTranslator } from "@/lib/i18n/t";
import { listLibraryEntries, rowsToProfileEntries } from "@/lib/lists/entries";
import { DEFAULT_CSS, DEFAULT_HTML_TEMPLATE } from "@/lib/theme/defaults";
import { renderTheme } from "@/lib/theme/render";
import { buildThemeDocument } from "@/lib/theme/save";

type PublicProfilePageProps = {
  params: Promise<{ username: string }>;
};

// React's cache() dedupes this per request, so generateMetadata and the page
// share a single query.
const getProfileUser = cache(async (username: string) =>
  db.query.users.findFirst({
    columns: {
      id: true,
      username: true,
      displayName: true,
      profileLocale: true,
    },
    where: eq(users.username, username),
  }),
);

function profileLocaleOf(value: string | null | undefined): Locale {
  return isLocale(value) ? value : "es";
}

export async function generateMetadata({
  params,
}: PublicProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const user = await getProfileUser(username);
  // Unknown profile: the page itself responds with notFound().
  if (!user?.username) return {};

  // Same language as the profile content rather than the visitor's locale.
  const t = createTranslator(
    await getDictionary(profileLocaleOf(user.profileLocale)),
  );
  const name = user.displayName ?? user.username;

  return {
    title: name,
    description: t("meta.profileDescription", { name }),
  };
}

export default async function PublicProfilePage({
  params,
}: PublicProfilePageProps) {
  const { username } = await params;
  const user = await getProfileUser(username);
  if (!user?.username) {
    notFound();
  }

  const profileLocale = profileLocaleOf(user.profileLocale);
  const dict = await getDictionary(profileLocale);
  const t = createTranslator(dict);

  const [rows, storedTheme] = await Promise.all([
    listLibraryEntries(user.id),
    db.query.profileThemes.findFirst({
      where: eq(profileThemes.userId, user.id),
    }),
  ]);
  const entries = rowsToProfileEntries(rows, profileLocale);
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
    t,
  });
  if (!rendered.ok) {
    rendered = renderTheme({
      template: DEFAULT_HTML_TEMPLATE,
      css: DEFAULT_CSS,
      username: user.username,
      displayName: user.displayName ?? user.username,
      entries,
      t,
    });
  }
  if (!rendered.ok) {
    throw new Error("default profile theme is invalid");
  }

  return (
    <main className="flex flex-1 bg-white">
      {/* Links may navigate the whole tab, only on a real click. Scripts,
          forms, popups and same-origin access stay blocked. The editor
          preview keeps sandbox="" so a click can't drop unsaved edits. */}
      <iframe
        sandbox="allow-top-navigation-by-user-activation"
        title={t("customize.profileFrameTitle", {
          name: user.displayName ?? user.username,
        })}
        srcDoc={buildThemeDocument(rendered.html, rendered.css, profileLocale)}
        className="min-h-[calc(100vh-4rem)] w-full border-0"
      />
    </main>
  );
}
