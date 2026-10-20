"use client";

import { createContext, useContext, type ReactNode } from "react";

export type StatusLabels = {
  errorTitle: string;
  errorBody: string;
  retry: string;
};

const StatusLabelsContext = createContext<StatusLabels | null>(null);

/**
 * Hands translated copy to `error.tsx`, which can't take props or load the
 * dictionary itself without shipping both dictionaries to every page.
 */
export function StatusLabelsProvider({
  labels,
  children,
}: {
  labels: StatusLabels;
  children: ReactNode;
}) {
  return (
    <StatusLabelsContext.Provider value={labels}>
      {children}
    </StatusLabelsContext.Provider>
  );
}

export function useStatusLabels(): StatusLabels | null {
  return useContext(StatusLabelsContext);
}
