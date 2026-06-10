import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowed } from "@/lib/auth/allowlist";

/**
 * OAuth callback handler.
 * Supabase redirects here after the user authenticates with Google.
 * Exchanges the auth code for a session cookie, then redirects home.
 *
 * SECURITY GATE: a valid Google login is NOT enough. After the session is
 * established we check the authenticated email against the allowlist. If the
 * account is not one of the three allowed (admin / user / test) we sign the
 * session back out and bounce to login with a "denied" indicator — so an
 * unauthorized Google account can never hold a usable Ledger session.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Only honor `next` if it's a same-site relative path. Reject "//evil.com",
  // "/\evil.com", and absolute URLs so the post-login redirect can't be hijacked.
  const nextParam = searchParams.get("next");
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") && !nextParam.startsWith("/\\")
      ? nextParam
      : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Confirm the authenticated identity is allowlisted before granting entry.
      const { data } = await supabase.auth.getUser();
      if (isAllowed(data.user?.email)) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      // Authenticated but NOT allowlisted → revoke the session, deny entry.
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/login?error=denied`);
    }
  }

  // Auth failed — redirect to login with error indicator
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
