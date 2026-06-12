"use client";

import { useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Idle-timeout auto-logout.
 *
 * WHY: Ledger holds real financial data. A session that never expires means a
 * laptop left open in a shared space stays fully authenticated. Council flagged
 * this as a high-severity gap for a financial app. After a window of no user
 * activity we sign the session out and send the user back to /login.
 *
 * This is a CLIENT-side guard. It complements (does not replace) the Supabase
 * JWT lifetime, which is a server/dashboard setting configured separately.
 *
 * Activity = pointer / keyboard / scroll / touch. Each resets the timer. The
 * default 15-minute window balances security against not nagging the user mid-task.
 */

const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
];

type UseIdleTimeoutOptions = {
  /** Inactivity window before auto-logout. Defaults to 15 minutes. */
  timeoutMs?: number;
  /** Called right before sign-out (e.g. to flush state). Optional. */
  onTimeout?: () => void;
};

export function useIdleTimeout({ timeoutMs = DEFAULT_TIMEOUT_MS, onTimeout }: UseIdleTimeoutOptions = {}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback(async () => {
    onTimeout?.();
    const supabase = createClient();
    await supabase.auth.signOut();
    // Hard redirect rather than client router: guarantees a clean unauthenticated
    // load even if React state is mid-update.
    window.location.assign("/login?error=idle");
  }, [onTimeout]);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void logout();
    }, timeoutMs);
  }, [logout, timeoutMs]);

  useEffect(() => {
    reset(); // start the clock on mount
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, reset, { passive: true }));
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, reset));
    };
  }, [reset]);
}
