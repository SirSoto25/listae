import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EntryForm } from "@/components/entry-form";
import { WorkCover } from "@/components/work-cover";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, works } from "@/lib/db/schema";
import { getEntry } from "@/lib/lists/entries";

type TitlePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
};

export default async function TitlePage({
  params,
  searchParams,
}: TitlePageProps) {
  const { id } = await params;
  const work = await db.query.works.findFirst({
    where: eq(works.id, id),
  });
  if (!work) {
    notFound();
  }

  const session = await auth();
  const user = session?.user?.email
    ? await db.query.users.findFirst({
        columns: { id: true },
        where: eq(users.email, session.user.email),
      })
    : null;
  const entry = user ? await getEntry(user.id, work.id) : null;
  const { saved } = await searchParams;

  const total =
    work.type === "anime" || work.type === "series"
      ? work.episodesTotal
      : entry?.progressUnit === "pages"
        ? work.pagesTotal
        : work.chaptersTotal;

  return (
    <main className="flex-1 bg-[#f7f5f0] px-6 py-10 text-stone-950">
      <div className="mx-auto max-w-5xl">
        <Link
          className="text-sm font-bold text-stone-600 hover:text-amber-700"
          href="/"
        >
          ← Back to search
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[18rem_1fr]">
          <WorkCover
            className="aspect-[2/3] w-full rounded-3xl shadow-xl"
            src={work.coverUrl}
            alt={`Cover of ${work.title}`}
          />

          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-700">
              <span>{work.type}</span>
              {work.year && (
                <>
                  <span className="text-stone-300">/</span>
                  <span className="text-stone-500">{work.year}</span>
                </>
              )}
              {work.externalSource && (
                <>
                  <span className="text-stone-300">/</span>
                  <span className="text-stone-500">
                    {work.externalSource}
                  </span>
                </>
              )}
            </div>
            <h1 className="mt-4 text-4xl font-black leading-tight tracking-[-0.035em] sm:text-5xl">
              {work.title}
            </h1>
            {work.originalTitle && (
              <p className="mt-2 text-lg text-stone-500">
                {work.originalTitle}
              </p>
            )}
            {work.synopsis ? (
              <p className="mt-6 max-w-2xl leading-7 text-stone-700">
                {work.synopsis}
              </p>
            ) : (
              <p className="mt-6 italic text-stone-500">
                No synopsis is available for this title yet.
              </p>
            )}

            <section className="mt-10 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">
                    My entry
                  </p>
                  <h2 className="mt-1 text-2xl font-black">
                    {entry ? "Update your progress" : "Add to your library"}
                  </h2>
                </div>
                {entry?.score && (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-xl font-black text-amber-900">
                    {entry.score}
                  </div>
                )}
              </div>

              {saved === "1" && (
                <p className="mb-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                  Your library entry was saved.
                </p>
              )}

              {user ? (
                <EntryForm
                  workId={work.id}
                  workType={work.type}
                  total={total}
                  entry={entry}
                />
              ) : (
                <Link
                  className="flex h-12 items-center justify-center rounded-xl bg-stone-950 px-5 font-bold text-white hover:bg-amber-700"
                  href="/login"
                >
                  Sign in to track this title
                </Link>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
