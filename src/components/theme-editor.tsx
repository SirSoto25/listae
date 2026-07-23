"use client";

import { useMemo, useState, useTransition } from "react";

import {
  saveThemeAction,
  type SaveThemeResult,
} from "@/app/actions/theme";
import { DomainThemePicker } from "@/components/domain-theme-picker";
import { DEFAULT_CSS } from "@/lib/theme/defaults";
import {
  parseDomainVarsBlock,
  upsertDomainVarsBlock,
  type DomainVarsInput,
} from "@/lib/theme/domain-vars";
import type { ProfileEntry } from "@/lib/theme/placeholders";
import { renderTheme } from "@/lib/theme/render";
import { buildThemeDocument } from "@/lib/theme/save";

const FALLBACK_DOMAIN_VARS: DomainVarsInput = {
  audiovisual: { bg: "#1a2238", accent: "#6b7ae8", fg: "#e8eef9" },
  reading: { bg: "#1c222c", accent: "#7a8a9a", fg: "#e8eef0" },
};

function domainVarsFromCss(css: string): DomainVarsInput {
  return (
    parseDomainVarsBlock(css) ??
    parseDomainVarsBlock(DEFAULT_CSS) ??
    FALLBACK_DOMAIN_VARS
  );
}

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
  const [domainVars, setDomainVars] = useState(() =>
    domainVarsFromCss(initialCustomCss),
  );
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
    setDomainVars(domainVarsFromCss(defaultCustomCss));
    setResult(null);
  }

  function applyDomainColors() {
    try {
      setCustomCss((css) => upsertDomainVarsBlock(css, domainVars));
      setResult(null);
    } catch {
      setResult({
        ok: false,
        errors: [
          {
            message:
              "Domain colors must be valid #RRGGBB hex values before applying.",
          },
        ],
      });
    }
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
          <span className="text-sm font-black text-foreground">
            HTML template
          </span>
          <span className="mt-1 block text-xs text-muted">
            Supported placeholders: {"{{displayName}}"}, {"{{username}}"},{" "}
            {"{{audiovisual_lists}}"}, {"{{reading_lists}}"}, and{" "}
            {"{{lists}}"}.
          </span>
          <textarea
            className="mt-3 min-h-72 w-full rounded-[length:var(--radius-panel)] border border-border bg-primary p-4 font-mono text-sm leading-6 text-primary-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/20"
            name="htmlTemplate"
            value={htmlTemplate}
            onChange={(event) => setHtmlTemplate(event.target.value)}
            spellCheck={false}
          />
        </label>

        <DomainThemePicker
          value={domainVars}
          onChange={setDomainVars}
          onApply={applyDomainColors}
        />

        <label className="block">
          <span className="text-sm font-black text-foreground">
            Custom CSS
          </span>
          <span className="mt-1 block text-xs text-muted">
            HTTPS Google Fonts imports are allowed. JavaScript is never run.
            Domain picker rewrites the marked /* listae:domain-vars */ block
            only.
          </span>
          <textarea
            className="mt-3 min-h-96 w-full rounded-[length:var(--radius-panel)] border border-border bg-primary p-4 font-mono text-sm leading-6 text-primary-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/20"
            name="customCss"
            value={customCss}
            onChange={(event) => setCustomCss(event.target.value)}
            spellCheck={false}
          />
        </label>

        {errors.length > 0 && (
          <div
            className="rounded-[length:var(--radius-panel)] border border-border bg-background p-4 text-sm text-foreground"
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
                    <code className="mt-1 block overflow-x-auto rounded border border-border bg-surface px-2 py-1 font-mono text-xs text-muted">
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
            className="rounded-xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
            type="submit"
            disabled={isPending}
          >
            {isPending ? "Saving…" : "Save theme"}
          </button>
          <button
            className="rounded-xl border border-border bg-surface px-5 py-3 text-sm font-black text-foreground hover:border-accent hover:text-accent"
            type="button"
            onClick={restoreDefaults}
          >
            Restore defaults
          </button>
        </div>
      </form>

      <section className="min-w-0">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-black text-foreground">Live preview</h2>
          <span className="text-xs font-semibold text-muted">
            Sandboxed · scripts disabled
          </span>
        </div>
        <iframe
          sandbox=""
          title="Theme preview"
          srcDoc={previewDoc}
          className="min-h-[480px] w-full rounded-[length:var(--radius-panel)] border border-border bg-surface"
        />
      </section>
    </div>
  );
}
