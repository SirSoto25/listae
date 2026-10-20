"use client";

import type { DomainColorVars, DomainVarsInput } from "@/lib/theme/domain-vars";

export type DomainThemePickerLabels = {
  heading: string;
  help: string;
  audiovisual: string;
  reading: string;
  background: string;
  accent: string;
  text: string;
  /** Template with a `{label}` slot, e.g. "{label}: hex code". */
  hexInputAria: string;
  apply: string;
};

const COLOR_FIELDS = [
  { key: "bg", labelKey: "background" },
  { key: "accent", labelKey: "accent" },
  { key: "fg", labelKey: "text" },
] as const satisfies readonly {
  key: keyof DomainColorVars;
  labelKey: keyof DomainThemePickerLabels;
}[];

const DOMAINS = [
  { key: "audiovisual", labelKey: "audiovisual" },
  { key: "reading", labelKey: "reading" },
] as const satisfies readonly {
  key: keyof DomainVarsInput;
  labelKey: keyof DomainThemePickerLabels;
}[];

type DomainThemePickerProps = {
  labels: DomainThemePickerLabels;
  value: DomainVarsInput;
  onChange: (value: DomainVarsInput) => void;
  onApply: () => void;
};

function ColorField({
  label,
  hexAriaLabel,
  color,
  onChange,
}: {
  label: string;
  hexAriaLabel: string;
  color: string;
  onChange: (hex: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={color}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-12 cursor-pointer rounded border border-border bg-surface p-0.5"
          aria-label={label}
        />
        <input
          type="text"
          value={color}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          className="w-full rounded-lg border border-border bg-primary px-2.5 py-1.5 font-mono text-xs text-primary-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          pattern="#[0-9A-Fa-f]{6}"
          maxLength={7}
          aria-label={hexAriaLabel}
        />
      </span>
    </label>
  );
}

function DomainColorGroup({
  label,
  labels,
  colors,
  onChange,
}: {
  label: string;
  labels: DomainThemePickerLabels;
  colors: DomainColorVars;
  onChange: (colors: DomainColorVars) => void;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-black text-foreground">{label}</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        {COLOR_FIELDS.map(({ key, labelKey }) => {
          const fieldLabel = labels[labelKey];
          return (
            <ColorField
              key={key}
              label={fieldLabel}
              hexAriaLabel={labels.hexInputAria.replace("{label}", fieldLabel)}
              color={colors[key]}
              onChange={(hex) => onChange({ ...colors, [key]: hex })}
            />
          );
        })}
      </div>
    </fieldset>
  );
}

export function DomainThemePicker({
  labels,
  value,
  onChange,
  onApply,
}: DomainThemePickerProps) {
  return (
    <div className="space-y-5 rounded-[length:var(--radius-panel)] border border-border bg-background p-4">
      <div>
        <h3 className="text-sm font-black text-foreground">{labels.heading}</h3>
        <p className="mt-1 text-xs text-muted">{labels.help}</p>
      </div>

      {DOMAINS.map(({ key, labelKey }) => (
        <DomainColorGroup
          key={key}
          label={labels[labelKey]}
          labels={labels}
          colors={value[key]}
          onChange={(colors) => onChange({ ...value, [key]: colors })}
        />
      ))}

      <button
        type="button"
        onClick={onApply}
        className="rounded-xl border border-border bg-surface px-5 py-3 text-sm font-black text-foreground hover:border-accent hover:text-accent"
      >
        {labels.apply}
      </button>
    </div>
  );
}
