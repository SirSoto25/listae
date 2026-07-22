import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

import { EntryForm } from "@/components/entry-form";
import { LibraryFilters } from "@/components/library-filters";
import { WorkCover } from "@/components/work-cover";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { listLibraryEntries } from "@/lib/lists/entries";
import {
  LIST_STATUSES,
  WORK_TYPES,
  type ListStatus,
  type WorkType,
} from "@/types/domain";

type LibraryPageProps = {
  searchParams: Promise<{
    type?: string;
    status?: string;
    sort?: string;
    saved?: string;
  }>;
};

function parseType(value?: string): WorkType | "all" {
  return value && WORK_TYPES.includes(value as WorkType)
    ? (value as WorkType)
    : "all";
}

function parseStatus(value?: string): ListStatus | "all" {
  return value && LIST_STATUSES.includes(value as ListStatus)
    ? (value as ListStatus)
    : "all";
}

function parseSort(value?: string): "updatedAt" | "score" | "title" {
  return value === "score" || value === "title" ? value : "updatedAt";
}

export default async function LibraryPage({
  searchParams,
}: LibraryPageProps) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await db.query.users.findFirst({
    columns: { id: true, username: true, displayName: true },
    where: eq(users.email, session.user.email),
  });
  if (!user) {
    redirect("/login");
  }
  if (!user.username) {
    redirect("/onboarding");
  }

  const params = await searchParams;
  const type = parseType(params.type);
  const status = parseStatus(params.status);
  const sort = parseSort(params.sort);
  const entries = await listLibraryEntries(user.id, { type, status, sort });
  const returnPath = `/library?${new URLSearchParams({
    type,
    status,
    sort,
    saved: "1",
  }).toString()}`;

  return (
    <main className="flex-1 bg-[#f7f5f0] px-6 py-10 text-stone-950">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-6 border-b border-stone-300 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-700">
              {user.displayName ?? user.username}&apos;s collection
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] sm:text-5xl">
              My library
            </h1>
            <p className="mt-3 text-stone-600">
              {entries.length} {entries.length === 1 ? "title" : "titles"} in
              this view
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-300 bg-white px-5 text-sm font-bold text-stone-800 hover:border-amber-700 hover:text-amber-700"
              href={`/u/${user.username}/customize`}
            >
              Customize profile
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl bg-stone-950 px-5 text-sm font-bold text-white hover:bg-amber-700"
              href="/"
            >
              + Find a title
            </Link>
          </div>
        </div>

        <div className="mt-6">
          <LibraryFilters type={type} status={status} sort={sort} />
        </div>

        {params.saved === "1" && (
          <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            Entry updated.
          </p>
        )}

        {entries.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-stone-300 bg-white/70 p-12 text-center">
            <h2 className="text-2xl font-black">Nothing in this view yet.</h2>
            <p className="mt-2 text-stone-600">
              Change the filters or search for something worth tracking.
            </p>
            <Link
              className="mt-6 inline-flex h-11 items-center rounded-xl bg-amber-700 px-5 text-sm font-bold text-white hover:bg-amber-800"
              href="/"
            >
              Search the catalog
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {entries.map(({ entry, work }) => {
              return (
                <article
                  key={entry.id}
                  className="grid gap-5 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm lg:grid-cols-[5rem_14rem_1fr] lg:items-center"
                >
                  <WorkCover
                    className="hidden aspect-[2/3] rounded-xl lg:block"
                    src={work.coverUrl}
                    alt=""
                  />
                  <div className="min-w-0">
                    <div className="text-[11px] font-black uppercase tracking-widest text-amber-700">
                      {work.type}
                    </div>
                    <Link
                      className="mt-1 block truncate text-lg font-black hover:text-amber-700"
                      href={`/title/${work.id}`}
                    >
                      {work.title}
                    </Link>
                    <p className="mt-1 text-xs text-stone-500">
                      Updated{" "}
                      {new Intl.DateTimeFormat("en", {
                        dateStyle: "medium",
                      }).format(entry.updatedAt)}
                    </p>
                  </div>
                  <EntryForm
                    compact
                    workId={work.id}
                    workType={work.type}
                    episodesTotal={work.episodesTotal}
                    chaptersTotal={work.chaptersTotal}
                    pagesTotal={work.pagesTotal}
                    entry={entry}
                    returnPath={returnPath}
                  />
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
