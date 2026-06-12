"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type UseGoogleSignIn = {
  loading: boolean;
  errorMsg: string | null;
  signIn: () => Promise<void>;
};

/**
 * Encapsulates Google OAuth sign-in state and logic.
 * errorMsg is initialised from ?error= URL param (set by /auth/callback on failure).
 */
export function useGoogleSignIn(): UseGoogleSignIn {
  const [loading, setLoading] = useState(false);
  // Start null so the client's first render matches the server's (which has no
  // `window`). Reading the URL here would diverge server vs client HTML → a
  // hydration mismatch. We read it AFTER mount, in the effect below.
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // Read the URL only after mount (client-only) — the server render has no
    // `window`, so reading it during render would diverge server vs client HTML.
    if (new URLSearchParams(window.location.search).get("error")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe URL error-param read on mount
      setErrorMsg("Sign-in failed. Please try again.");
    }
  }, []);

  const signIn = async () => {
    setLoading(true);
    setErrorMsg(null);

    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (oauthError) {
      setErrorMsg("Sign-in failed. Please try again.");
      setLoading(false);
    }
    // On success Supabase navigates away — nothing more to do here
  };

  return { loading, errorMsg, signIn };
}
