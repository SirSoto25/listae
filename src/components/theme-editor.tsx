"use client";

import { useMemo, useState, useTransition } from "react";

import {
  saveThemeAction,
  type SaveThemeResult,
} from "@/app/actions/theme";
import type { ProfileEntry } from "@/lib/theme/placeholders";
import { renderTheme } from "@/lib/theme/render";
import { buildThemeDocument } from "@/lib/theme/save";

type ThemeEditorProps = {
  username: string;
  displayName: string;
  entries: ProfileEntry[];
  initialHtmlTemplate: string;
  initialCustomCss: string;
  defaultHtmlTemplate: string;
  defaultCustomCss: string;
};

export function ThemeEditor({
  username,
  displayName,
  entries,
  initialHtmlTemplate,
  initialCustomCss,
  defaultHtmlTemplate,
  defaultCustomCss,
}: ThemeEditorProps) {
  const [htmlTemplate, setHtmlTemplate] = useState(initialHtmlTemplate);
  const [customCss, setCustomCss] = useState(initialCustomCss);
  const [result, setResult] = useState<SaveThemeResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const preview = useMemo(
    () =>
      renderTheme({
        template: htmlTemplate,
        css: customCss,
        username,
        displayName,
        entries,
      }),
    [customCss, displayName, entries, htmlTemplate, username],
  );
  const previewDoc = preview.ok
    ? buildThemeDocument(preview.html, preview.css)
    : buildThemeDocument(
        '<main style="font-family:system-ui;padding:2rem"><h1>Preview unavailable</h1><p>Fix the CSS errors to continue.</p></main>',
        "",
      );

  function restoreDefaults() {
    setHtmlTemplate(defaultHtmlTemplate);
    setCustomCss(defaultCustomCss);
    setResult(null);
  }

  function saveTheme() {
    setResult(null);
    startTransition(async () => {
      setResult(await saveThemeAction({ htmlTemplate, customCss }));
    });
  }

  const errors =
    result && !result.ok
      ? result.errors
      : !preview.ok
        ? preview.errors
        : [];

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(28rem,1fr)]">
      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          saveTheme();
        }}
      >
        <label className="block">
          <span className="text-sm font-black text-stone-900">
            HTML template
          </span>
          <span className="mt-1 block text-xs text-stone-500">
            Supported placeholders: {"{{displayName}}"}, {"{{username}}"},{" "}
            and {"{{lists}}"}.
          </span>
          <textarea
            className="mt-3 min-h-72 w-full rounded-2xl border border-stone-300 bg-stone-950 p-4 font-mono text-sm leading-6 text-stone-100 outline-none focus:border-amber-600"
            name="htmlTemplate"
            value={htmlTemplate}
            onChange={(event) => setHtmlTemplate(event.target.value)}
            spellCheck={false}
          />
        </label>

        <label className="block">
          <span className="text-sm font-black text-stone-900">
            Custom CSS
          </span>
          <span className="mt-1 block text-xs text-stone-500">
            HTTPS Google Fonts imports are allowed. JavaScript is never run.
          </span>
          <textarea
            className="mt-3 min-h-96 w-full rounded-2xl border border-stone-300 bg-stone-950 p-4 font-mono text-sm leading-6 text-stone-100 outline-none focus:border-amber-600"
            name="customCss"
            value={customCss}
            onChange={(event) => setCustomCss(event.target.value)}
            spellCheck={false}
          />
        </label>

        {errors.length > 0 && (
          <div
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
            role="alert"
          >
            <p className="font-black">Fix these CSS errors:</p>
            <ul className="mt-2 space-y-3">
              {errors.map((error, index) => (
                <li key={`${error.line}-${error.column}-${index}`}>
                  <p>
                    {error.line ? `Line ${error.line}` : "CSS"}
                    {error.column ? `, column ${error.column}` : ""}:{" "}
                    {error.message}
                  </p>
                  {error.snippet && (
                    <code className="mt-1 block overflow-x-auto rounded bg-red-100 px-2 py-1 font-mono text-xs">
                      {error.snippet}
                    </code>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result?.ok && (
          <p
            className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800"
            role="status"
          >
            Theme saved.
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-xl bg-stone-950 px-5 py-3 text-sm font-black text-white hover:bg-amber-700 disabled:cursor-wait disabled:opacity-60"
            type="submit"
            disabled={isPending}
          >
            {isPending ? "Saving…" : "Save theme"}
          </button>
          <button
            className="rounded-xl border border-stone-300 bg-white px-5 py-3 text-sm font-black text-stone-800 hover:border-amber-700 hover:text-amber-700"
            type="button"
            onClick={restoreDefaults}
          >
            Restore defaults
          </button>
        </div>
      </form>

      <section className="min-w-0">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-black text-stone-900">Live preview</h2>
          <span className="text-xs font-semibold text-stone-500">
            Sandboxed · scripts disabled
          </span>
        </div>
        <iframe
          sandbox=""
          title="Theme preview"
          srcDoc={previewDoc}
          className="min-h-[480px] w-full rounded-2xl border border-stone-300 bg-white"
        />
      </section>
    </div>
  );
}
