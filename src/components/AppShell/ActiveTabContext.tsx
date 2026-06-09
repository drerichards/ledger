"use client";

import { createContext, useContext } from "react";

const ActiveTabContext = createContext<string | null>(null);

export const ActiveTabProvider = ActiveTabContext.Provider;

/**
 * Returns the id of the currently active tab, or `null` when the caller is
 * rendered outside an AppShell (e.g. in isolated component tests).
 */
export function useActiveTab(): string | null {
  return useContext(ActiveTabContext);
}
