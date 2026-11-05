import { LocaleLink } from "@/components/locale-link";
import {
  createManualWorkAction,
  importHitAction,
} from "@/app/actions/works";
import { CatalogSearch } from "@/components/catalog-search";
import { WorkCover } from "@/components/work-cover";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import {
  MAX_QUERY_LENGTH,
  MIN_QUERY_LENGTH,
  searchCatalog,
  type CatalogSearchResult,
} from "@/lib/catalog/search";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/path";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import {
  catalogSearchLabels,
  sourceLabels,
  workTypeLabels,
} from "@/lib/i18n/labels";
import { createTranslator } from "@/lib/i18n/t";
import { clientIpFromHeaders } from "@/lib/security/client-ip";
import { workTitle } from "@/lib/i18n/work-text";
import { WORK_TYPES, type WorkType } from "@/types/domain";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

type HomeProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string | string[]; type?: string | string[] }>;
};

function firstParam(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function validType(value?: string): WorkType | "all" {
  return value && WORK_TYPES.includes(value as WorkType)
    ? (value as WorkType)
    : "all";
}

export default async function Home({ params, searchParams }: HomeProps) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const dict = await getDictionary(locale);
  const t = createTranslator(dict);
  const typeLabels = workTypeLabels(t);
  const sourceLabel = sourceLabels(t);

  const sp = await searchParams;
  const query = firstParam(sp.q)?.trim() ?? "";
  const type = validType(firstParam(sp.type));
  const clientIp = clientIpFromHeaders(await headers());
  const tooShort = query.length > 0 && query.length < MIN_QUERY_LENGTH;
  const search: CatalogSearchResult =
    query && !tooShort
      ? await searchCatalog(query, type, locale, clientIp)
      : { status: "ok", hits: [] };
  const results = search.hits;
  const failed =
    search.status === "rate_limited" || search.status === "provider_down";

  // The same search as a link: the retry target, and where an anonymous
  // visitor lands after logging in from "Track this title".
  const searchParamsOut = new URLSearchParams({ q: query });
  if (type !== "all") searchParamsOut.set("type", type);
  const searchHref = `${localePath(locale, "/")}?${searchParamsOut.toString()}`;

  let statusText = "";
  if (tooShort) {
    statusText = t("home.minQuery", { min: MIN_QUERY_LENGTH });
  } else if (query && search.status === "rate_limited") {
    statusText = t("home.statusRateLimited");
  } else if (query && search.status === "provider_down") {
    statusText = t("home.statusProviderDown");
  } else if (query) {
    statusText =
      results.length === 1
        ? t("home.foundOne")
        : t("home.foundCount", { count: results.length });
  }

  return (
    <div className="flex-1 bg-transparent text-foreground">
      <section className="border-b border-border px-6 py-14 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.28em] text-accent">
            {t("home.tagline")}
          </p>
          <div className="grid gap-8 lg:grid-cols-[1fr_18rem] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-4xl font-black leading-[1.05] tracking-[-0.04em] sm:text-6xl">
                {t("home.title")}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
                {t("home.subtitle")}
              </p>
            </div>
            <LocaleLink
              className="justify-self-start border-b-2 border-foreground pb-1 text-sm font-bold hover:border-accent hover:text-accent lg:justify-self-end"
              href="/library"
              locale={locale}
            >
              {t("home.openLibrary")}
            </LocaleLink>
          </div>
          <div className="mt-10">
            <CatalogSearch
              locale={locale}
              labels={catalogSearchLabels(t)}
              initialQuery={query}
              initialType={type}
              minQueryLength={MIN_QUERY_LENGTH}
              maxQueryLength={MAX_QUERY_LENGTH}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-10">
        {!query && (
          <div className="rounded-3xl border border-dashed border-border bg-surface/70 p-10 text-center">
            <p className="text-2xl font-bold">{t("home.emptyTitle")}</p>
            <p className="mt-2 text-muted">{t("home.emptySubtitle")}</p>
          </div>
        )}

        {/* Always mounted so assistive tech announces the outcome of a search. */}
        <div
          className={
            query ? "mb-6 flex items-baseline justify-between gap-4" : undefined
          }
        >
          {query && (
            <h2 className="text-2xl font-black tracking-tight">
              {t("home.resultsFor", { query })}
            </h2>
          )}
          <p
            aria-atomic="true"
            aria-live="polite"
            className="text-sm text-muted empty:hidden"
            role="status"
          >
            {statusText}
          </p>
        </div>

        {search.status === "partial" && (
          <p className="mb-6 rounded-2xl border border-border bg-surface px-5 py-3 text-sm">
            {t("home.partialNotice")}{" "}
            <a
              className="font-bold underline underline-offset-4 hover:text-accent"
              href={searchHref}
            >
              {t("home.retrySearch")}
            </a>
          </p>
        )}

        {results.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((hit) => (
              <article
                key={`${hit.source}:${hit.externalId}`}
                className="catalog-hit-enter group grid grid-cols-[7rem_1fr] overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:grid-cols-1"
              >
                <WorkCover
                  className="h-full min-h-44 sm:aspect-[4/3] sm:min-h-0"
                  src={hit.coverUrl}
                  alt=""
                />
                <div className="flex min-w-0 flex-col p-5">
                  <div className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-accent">
                    <span>{typeLabels[hit.type]}</span>
                    <span className="text-border">/</span>
                    <span className="text-muted">
                      {sourceLabel[hit.source]}
                    </span>
                  </div>
                  <h3 className="line-clamp-2 text-lg font-bold leading-6">
                    {workTitle(hit, locale)}
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    {hit.year ?? t("common.yearUnknown")}
                  </p>
                  <ActionForm className="mt-auto pt-5" action={importHitAction}>
                    <input type="hidden" name="source" value={hit.source} />
                    <input
                      type="hidden"
                      name="externalId"
                      value={hit.externalId}
                    />
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="returnTo" value={searchHref} />
                    <SubmitButton
                      aria-label={t("catalog.trackTitleFor", {
                        title: workTitle(hit, locale),
                      })}
                      className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 group-hover:opacity-90">
                      {t("catalog.trackTitle")}
                    </SubmitButton>
                  </ActionForm>
                </div>
              </article>
            ))}
          </div>
        )}

        {query && !tooShort && failed && (
          <div className="rounded-3xl border border-border bg-surface p-8 text-center">
            <h3 className="text-xl font-bold">
              {search.status === "rate_limited"
                ? t("home.rateLimitedTitle")
                : t("home.providerDownTitle")}
            </h3>
            <p className="mt-2 text-muted">
              {search.status === "rate_limited"
                ? t("home.rateLimitedBody")
                : t("home.providerDownBody")}
            </p>
            <a
              className="mt-5 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90"
              href={searchHref}
            >
              {t("home.retrySearch")}
            </a>
          </div>
        )}

        {query && !tooShort && search.status === "ok" && results.length === 0 && (
          <div className="rounded-3xl border border-border bg-surface p-8 text-center">
            <h3 className="text-xl font-bold">{t("home.noMatchTitle")}</h3>
            <p className="mt-2 text-muted">{t("home.noMatchSubtitle")}</p>
          </div>
        )}

        {query && (
          <details className="mt-8 rounded-2xl border border-border bg-surface p-5 open:shadow-sm">
            <summary className="cursor-pointer font-bold text-foreground">
              {t("home.manualTitle")}
            </summary>
            <ActionForm
              className="mt-6 grid gap-4 sm:grid-cols-2"
              action={createManualWorkAction}
            >
              <input type="hidden" name="locale" value={locale} />
              <label className="grid gap-1.5 text-sm font-semibold">
                {t("home.fieldTitle")}
                <input
                  className="h-11 rounded-xl border border-border-control bg-surface px-3 outline-none focus:border-accent"
                  name="title"
                  maxLength={300}
                  defaultValue={query}
                  required
                />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold">
                {t("home.fieldType")}
                <select
                  className="h-11 rounded-xl border border-border-control bg-surface px-3 outline-none focus:border-accent"
                  name="type"
                  defaultValue={type === "all" ? "movie" : type}
                >
                  {WORK_TYPES.map((workType) => (
                    <option key={workType} value={workType}>
                      {typeLabels[workType]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold">
                {t("home.fieldOriginalTitle")}
                <input
                  className="h-11 rounded-xl border border-border-control bg-surface px-3 outline-none focus:border-accent"
                  name="originalTitle"
                  maxLength={300}
                />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold">
                {t("home.fieldYear")}
                <input
                  className="h-11 rounded-xl border border-border-control bg-surface px-3 outline-none focus:border-accent"
                  type="number"
                  name="year"
                  min={0}
                />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">
                {t("home.fieldCoverUrl")}
                <input
                  className="h-11 rounded-xl border border-border-control bg-surface px-3 outline-none focus:border-accent"
                  type="url"
                  name="coverUrl"
                  maxLength={500}
                  pattern="https://.*"
                  placeholder="https://…"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">
                {t("home.fieldSynopsis")}
                <textarea
                  className="min-h-24 rounded-xl border border-border-control bg-surface px-3 py-2 outline-none focus:border-accent"
                  name="synopsis"
                  maxLength={5000}
                />
              </label>
              <div className="grid grid-cols-3 gap-3 sm:col-span-2">
                {(
                  [
                    ["episodesTotal", t("home.fieldEpisodes")],
                    ["chaptersTotal", t("home.fieldChapters")],
                    ["pagesTotal", t("home.fieldPages")],
                  ] as const
                ).map(([name, label]) => (
                  <label
                    key={name}
                    className="grid gap-1.5 text-sm font-semibold"
                  >
                    {label}
                    <input
                      className="h-11 min-w-0 rounded-xl border border-border-control bg-surface px-3 outline-none focus:border-accent"
                      type="number"
                      name={name}
                      min={0}
                    />
                  </label>
                ))}
              </div>
              <SubmitButton
                className="h-12 rounded-xl bg-primary px-5 font-bold text-primary-foreground hover:opacity-90 sm:col-span-2">
                {t("home.createTitle")}
              </SubmitButton>
            </ActionForm>
          </details>
        )}
      </section>
    </div>
  );
}
