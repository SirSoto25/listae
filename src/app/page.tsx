import Link from "next/link";

import {
  createManualWorkAction,
  importHitAction,
} from "@/app/actions/works";
import { CatalogSearch } from "@/components/catalog-search";
import { WorkCover } from "@/components/work-cover";
import { searchCatalog } from "@/lib/catalog/search";
import { WORK_TYPES, type WorkType } from "@/types/domain";

type HomeProps = {
  searchParams: Promise<{ q?: string; type?: string }>;
};

function validType(value?: string): WorkType | "all" {
  return value && WORK_TYPES.includes(value as WorkType)
    ? (value as WorkType)
    : "all";
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const type = validType(params.type);
  const results = query ? await searchCatalog(query, type) : [];

  return (
    <main className="flex-1 bg-[#f7f5f0] text-stone-950">
      <section className="border-b border-stone-200 bg-[radial-gradient(circle_at_top_left,#fef3c7,transparent_38%),#f7f5f0] px-6 py-14 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.28em] text-amber-700">
            Your media, one place
          </p>
          <div className="grid gap-8 lg:grid-cols-[1fr_18rem] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-4xl font-black leading-[1.05] tracking-[-0.04em] sm:text-6xl">
                Find it. Track it. Remember it.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">
                Search films, series, anime, books, manga, and comics—then
                keep your progress without the noise.
              </p>
            </div>
            <Link
              className="justify-self-start border-b-2 border-stone-950 pb-1 text-sm font-bold hover:border-amber-700 hover:text-amber-800 lg:justify-self-end"
              href="/library"
            >
              Open my library →
            </Link>
          </div>
          <div className="mt-10">
            <CatalogSearch initialQuery={query} initialType={type} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-10">
        {!query && (
          <div className="rounded-3xl border border-dashed border-stone-300 bg-white/70 p-10 text-center">
            <p className="text-2xl font-bold">What are you into lately?</p>
            <p className="mt-2 text-stone-600">
              Start typing above to search the shared catalog.
            </p>
          </div>
        )}

        {query && (
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 className="text-2xl font-black tracking-tight">
              Results for “{query}”
            </h2>
            <span className="text-sm text-stone-500">
              {results.length} found
            </span>
          </div>
        )}

        {results.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((hit) => (
              <article
                key={`${hit.source}:${hit.externalId}`}
                className="group grid grid-cols-[7rem_1fr] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:grid-cols-1"
              >
                <WorkCover
                  className="h-full min-h-44 sm:aspect-[4/3] sm:min-h-0"
                  src={hit.coverUrl}
                  alt=""
                />
                <div className="flex min-w-0 flex-col p-5">
                  <div className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-amber-700">
                    <span>{hit.type}</span>
                    <span className="text-stone-300">/</span>
                    <span className="text-stone-500">{hit.source}</span>
                  </div>
                  <h3 className="line-clamp-2 text-lg font-bold leading-6">
                    {hit.title}
                  </h3>
                  <p className="mt-1 text-sm text-stone-500">
                    {hit.year ?? "Year unknown"}
                  </p>
                  <form className="mt-auto pt-5" action={importHitAction}>
                    <input type="hidden" name="source" value={hit.source} />
                    <input
                      type="hidden"
                      name="externalId"
                      value={hit.externalId}
                    />
                    <input type="hidden" name="type" value={hit.type} />
                    <input type="hidden" name="title" value={hit.title} />
                    <input type="hidden" name="year" value={hit.year ?? ""} />
                    <input
                      type="hidden"
                      name="coverUrl"
                      value={hit.coverUrl ?? ""}
                    />
                    <button
                      className="w-full rounded-xl bg-stone-950 px-4 py-2.5 text-sm font-bold text-white transition group-hover:bg-amber-700"
                      type="submit"
                    >
                      Track this title
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}

        {query && results.length === 0 && (
          <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center">
            <h2 className="text-xl font-bold">No exact match surfaced.</h2>
            <p className="mt-2 text-stone-600">
              External catalogs can miss niche or newly released titles.
            </p>
          </div>
        )}

        {query && (
          <details className="mt-8 rounded-2xl border border-stone-200 bg-white p-5 open:shadow-sm">
            <summary className="cursor-pointer font-bold text-stone-900">
              Can&apos;t find it? Create a manual title
            </summary>
            <form
              className="mt-6 grid gap-4 sm:grid-cols-2"
              action={createManualWorkAction}
            >
              <label className="grid gap-1.5 text-sm font-semibold">
                Title
                <input
                  className="h-11 rounded-xl border border-stone-300 px-3 outline-none focus:border-amber-600"
                  name="title"
                  defaultValue={query}
                  required
                />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold">
                Type
                <select
                  className="h-11 rounded-xl border border-stone-300 bg-white px-3 outline-none focus:border-amber-600"
                  name="type"
                  defaultValue={type === "all" ? "movie" : type}
                >
                  {WORK_TYPES.map((workType) => (
                    <option key={workType} value={workType}>
                      {workType}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold">
                Original title
                <input
                  className="h-11 rounded-xl border border-stone-300 px-3 outline-none focus:border-amber-600"
                  name="originalTitle"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold">
                Year
                <input
                  className="h-11 rounded-xl border border-stone-300 px-3 outline-none focus:border-amber-600"
                  type="number"
                  name="year"
                  min={0}
                />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">
                Cover URL
                <input
                  className="h-11 rounded-xl border border-stone-300 px-3 outline-none focus:border-amber-600"
                  type="url"
                  name="coverUrl"
                  placeholder="https://…"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">
                Synopsis
                <textarea
                  className="min-h-24 rounded-xl border border-stone-300 px-3 py-2 outline-none focus:border-amber-600"
                  name="synopsis"
                />
              </label>
              <div className="grid grid-cols-3 gap-3 sm:col-span-2">
                {[
                  ["episodesTotal", "Episodes"],
                  ["chaptersTotal", "Chapters"],
                  ["pagesTotal", "Pages"],
                ].map(([name, label]) => (
                  <label
                    key={name}
                    className="grid gap-1.5 text-sm font-semibold"
                  >
                    {label}
                    <input
                      className="h-11 min-w-0 rounded-xl border border-stone-300 px-3 outline-none focus:border-amber-600"
                      type="number"
                      name={name}
                      min={0}
                    />
                  </label>
                ))}
              </div>
              <button
                className="h-12 rounded-xl bg-amber-700 px-5 font-bold text-white hover:bg-amber-800 sm:col-span-2"
                type="submit"
              >
                Create title
              </button>
            </form>
          </details>
        )}
      </section>
    </main>
  );
}
