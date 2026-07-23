"use client";

import type { DomainColorVars, DomainVarsInput } from "@/lib/theme/domain-vars";

const COLOR_FIELDS = [
  { key: "bg", label: "Background" },
  { key: "accent", label: "Accent" },
  { key: "fg", label: "Text" },
] as const;

const DOMAINS = [
  { key: "audiovisual", label: "Audiovisual" },
  { key: "reading", label: "Reading" },
] as const;

type DomainThemePickerProps = {
  value: DomainVarsInput;
  onChange: (value: DomainVarsInput) => void;
  onApply: () => void;
};

function ColorField({
  label,
  color,
  onChange,
}: {
  label: string;
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
        />
      </span>
    </label>
  );
}

function DomainColorGroup({
  label,
  colors,
  onChange,
}: {
  label: string;
  colors: DomainColorVars;
  onChange: (colors: DomainColorVars) => void;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-black text-foreground">{label}</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        {COLOR_FIELDS.map(({ key, label: fieldLabel }) => (
          <ColorField
            key={key}
            label={fieldLabel}
            color={colors[key]}
            onChange={(hex) => onChange({ ...colors, [key]: hex })}
          />
        ))}
      </div>
    </fieldset>
  );
}

export function DomainThemePicker({
  value,
  onChange,
  onApply,
}: DomainThemePickerProps) {
  return (
    <div className="space-y-5 rounded-[length:var(--radius-panel)] border border-border bg-background p-4">
      <div>
        <h3 className="text-sm font-black text-foreground">
          Domain colors
        </h3>
        <p className="mt-1 text-xs text-muted">
          Updates the marked CSS variable block for preview. Save theme to
          persist.
        </p>
      </div>

      {DOMAINS.map(({ key, label }) => (
        <DomainColorGroup
          key={key}
          label={label}
          colors={value[key]}
          onChange={(colors) => onChange({ ...value, [key]: colors })}
        />
      ))}

      <button
        type="button"
        onClick={onApply}
        className="rounded-xl border border-border bg-surface px-5 py-3 text-sm font-black text-foreground hover:border-accent hover:text-accent"
      >
        Apply domain colors
      </button>
    </div>
  );
}
