import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import { EntryForm } from "@/components/entry-form";
import { LocaleLink } from "@/components/locale-link";
import { WorkCover } from "@/components/work-cover";
import { fillMissingWorkLocale } from "@/lib/catalog/works";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, works } from "@/lib/db/schema";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { entryFormLabels } from "@/lib/i18n/labels";
import { localePath } from "@/lib/i18n/path";
import { createTranslator } from "@/lib/i18n/t";
import { workSynopsis, workTitle } from "@/lib/i18n/work-text";
import { getEntry } from "@/lib/lists/entries";

type TitlePageProps = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ saved?: string }>;
};

export default async function TitlePage({
  params,
  searchParams,
}: TitlePageProps) {
  const { locale: raw, id } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dict = await getDictionary(locale);
  const t = createTranslator(dict);

  let work = await db.query.works.findFirst({
    where: eq(works.id, id),
  });
  if (!work) {
    notFound();
  }

  const missingLocaleText =
    locale === "es" ? !work.titleEs?.trim() : !work.titleEn?.trim();
  if (missingLocaleText) {
    const filled = await fillMissingWorkLocale(work.id, locale);
    if (filled) {
      work =
        (await db.query.works.findFirst({
          where: eq(works.id, id),
        })) ?? work;
    }
  }

  const displayTitle = workTitle(work, locale);
  const displaySynopsis = workSynopsis(work, locale);

  const session = await auth();
  const user = session?.user?.email
    ? await db.query.users.findFirst({
        columns: { id: true },
        where: eq(users.email, session.user.email),
      })
    : null;
  const entry = user ? await getEntry(user.id, work.id) : null;
  const { saved } = await searchParams;

  return (
    <main className="flex-1 bg-transparent px-6 py-10 text-foreground">
      <div className="mx-auto max-w-5xl">
        <LocaleLink
          className="text-sm font-bold text-muted hover:text-accent"
          href="/"
          locale={locale}
        >
          {t("common.backToSearch")}
        </LocaleLink>

        <div className="mt-6 grid gap-8 lg:grid-cols-[18rem_1fr]">
          <WorkCover
            className="aspect-[2/3] w-full rounded-3xl shadow-xl"
            src={work.coverUrl}
            alt={t("titlePage.coverAlt", { title: displayTitle })}
          />

          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-accent">
              <span>{work.type}</span>
              {work.year && (
                <>
                  <span className="text-border">/</span>
                  <span className="text-muted">{work.year}</span>
                </>
              )}
              {work.externalSource && (
                <>
                  <span className="text-border">/</span>
                  <span className="text-muted">
                    {work.externalSource}
                  </span>
                </>
              )}
            </div>
            <h1 className="mt-4 text-4xl font-black leading-tight tracking-[-0.035em] sm:text-5xl">
              {displayTitle}
            </h1>
            {work.originalTitle && (
              <p className="mt-2 text-lg text-muted">
                {work.originalTitle}
              </p>
            )}
            {displaySynopsis ? (
              <p className="mt-6 max-w-2xl leading-7 text-muted">
                {displaySynopsis}
              </p>
            ) : (
              <p className="mt-6 italic text-muted">
                {t("titlePage.noSynopsis")}
              </p>
            )}

            <section className="mt-10 rounded-[length:var(--radius-panel)] border border-border bg-surface p-6 shadow-sm sm:p-8">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-accent">
                    {t("titlePage.myEntry")}
                  </p>
                  <h2 className="mt-1 text-2xl font-black">
                    {entry
                      ? t("titlePage.updateProgress")
                      : t("titlePage.addToLibrary")}
                  </h2>
                </div>
                {entry?.score && (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-xl font-black text-accent">
                    {entry.score}
                  </div>
                )}
              </div>

              {saved === "1" && (
                <p className="mb-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                  {t("titlePage.saved")}
                </p>
              )}

              {user ? (
                <EntryForm
                  locale={locale}
                  labels={entryFormLabels(t)}
                  workId={work.id}
                  workType={work.type}
                  episodesTotal={work.episodesTotal}
                  chaptersTotal={work.chaptersTotal}
                  pagesTotal={work.pagesTotal}
                  entry={entry}
                  returnPath={localePath(locale, `/title/${work.id}?saved=1`)}
                />
              ) : (
                <LocaleLink
                  className="flex h-12 items-center justify-center rounded-xl bg-primary px-5 font-bold text-primary-foreground hover:opacity-90"
                  href="/login"
                  locale={locale}
                >
                  {t("titlePage.signInToTrack")}
                </LocaleLink>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
