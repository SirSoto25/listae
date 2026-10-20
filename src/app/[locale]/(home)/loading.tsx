import { getDictionary } from "@/lib/i18n/get-dictionary";
import { requestLocale } from "@/lib/i18n/request-locale";
import { createTranslator } from "@/lib/i18n/t";

// loading.tsx receives no params, so the locale comes from the request.
export default async function LocaleLoading() {
  const t = createTranslator(await getDictionary(await requestLocale()));

  return (
    <main className="flex flex-1 items-center justify-center bg-transparent px-6 py-16">
      <div
        aria-live="polite"
        className="flex items-center gap-3 text-sm font-bold text-muted"
        role="status"
      >
        <span
          aria-hidden="true"
          className="size-5 rounded-full border-2 border-border border-t-accent motion-safe:animate-spin"
        />
        {t("status.loading")}
      </div>
    </main>
  );
}
