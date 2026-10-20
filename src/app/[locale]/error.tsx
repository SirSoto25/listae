"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

import { useStatusLabels } from "@/components/status-labels";

export default function LocaleError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  // Copy comes from the [locale] layout, which renders above this boundary.
  const labels = useStatusLabels();

  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center bg-transparent px-6 py-16">
      <section className="w-full max-w-md rounded-[length:var(--radius-panel)] border border-border bg-surface p-8">
        <div role="alert">
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            {labels?.errorTitle}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            {labels?.errorBody}
          </p>
        </div>
        <button
          className="mt-8 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:opacity-90"
          // Re-fetches and re-renders the segment, as documented for Next 16.2
          onClick={() => unstable_retry()}
          type="button"
        >
          {labels?.retry}
        </button>
      </section>
    </main>
  );
}
