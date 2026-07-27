"use client";

import { useState } from "react";

import {
  normalizeUsername,
  usernameMatchesEmailLocalPart,
} from "@/lib/auth/validation";

export type UsernameFieldLabels = {
  label: string;
  hint: string;
  warning: string;
};

type UsernameFieldProps = {
  email: string;
  labels: UsernameFieldLabels;
};

export function UsernameField({ email, labels }: UsernameFieldProps) {
  const [username, setUsername] = useState("");
  const showWarning =
    username.length > 0 && usernameMatchesEmailLocalPart(username, email);

  return (
    <>
      <label className="block text-sm font-medium text-foreground">
        {labels.label}
        <input
          className="mt-2 block w-full rounded-[length:var(--radius-control)] border border-border bg-surface px-3 py-2 text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/20"
          type="text"
          name="username"
          autoComplete="username"
          minLength={3}
          maxLength={32}
          pattern="[a-z0-9_]{3,32}"
          required
          value={username}
          onChange={(event) =>
            setUsername(normalizeUsername(event.target.value))
          }
        />
      </label>
      <p className="text-xs text-muted">{labels.hint}</p>
      {showWarning && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          {labels.warning}
        </p>
      )}
    </>
  );
}
