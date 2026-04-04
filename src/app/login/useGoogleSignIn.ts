"use client";

import { useState } from "react";
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
  const [errorMsg, setErrorMsg] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("error")
      ? "Sign-in failed. Please try again."
      : null;
  });

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
