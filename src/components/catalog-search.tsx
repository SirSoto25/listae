import type { Locale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/path";
import { WORK_TYPES, type WorkType } from "@/types/domain";

export type CatalogSearchLabels = {
  searchPlaceholder: string;
  searchAria: string;
  mediaTypeAria: string;
  allMedia: string;
  submit: string;
  workTypes: Record<WorkType, string>;
};

type CatalogSearchProps = {
  locale: Locale;
  labels: CatalogSearchLabels;
  initialQuery: string;
  initialType: WorkType | "all";
  minQueryLength: number;
  maxQueryLength: number;
};

/**
 * Search form. It is a plain `<form method="get">`: searching happens on
 * Enter or on the button (no navigation while typing, WCAG 3.2.2), and it
 * works without JavaScript. The page reads `q` and `type` from the URL.
 */
export function CatalogSearch({
  locale,
  labels,
  initialQuery,
  initialType,
  minQueryLength,
  maxQueryLength,
}: CatalogSearchProps) {
  return (
    <form
      className="grid gap-3 md:grid-cols-[1fr_12rem_auto]"
      role="search"
      method="get"
      action={localePath(locale, "/")}
    >
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-muted"
        >
          ⌕
        </span>
        <label className="sr-only" htmlFor="catalog-search-q">
          {labels.searchAria}
        </label>
        <input
          className="h-14 w-full rounded-2xl border border-border-control bg-surface pl-12 pr-4 text-base text-foreground shadow-sm transition"
          id="catalog-search-q"
          type="search"
          name="q"
          defaultValue={initialQuery}
          placeholder={labels.searchPlaceholder}
          minLength={minQueryLength}
          maxLength={maxQueryLength}
          autoComplete="off"
          enterKeyHint="search"
          required
        />
      </div>
      <div>
        <label className="sr-only" htmlFor="catalog-search-type">
          {labels.mediaTypeAria}
        </label>
        <select
          className="h-14 w-full rounded-2xl border border-border-control bg-surface px-4 font-medium text-foreground shadow-sm"
          id="catalog-search-type"
          name="type"
          defaultValue={initialType}
        >
          <option value="all">{labels.allMedia}</option>
          {WORK_TYPES.map((workType) => (
            <option key={workType} value={workType}>
              {labels.workTypes[workType]}
            </option>
          ))}
        </select>
      </div>
      <button
        className="h-14 rounded-2xl bg-primary px-6 font-bold text-primary-foreground transition hover:opacity-90"
        type="submit"
      >
        {labels.submit}
      </button>
    </form>
  );
}
