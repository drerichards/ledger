import type { CookieOptionsWithName } from "@supabase/ssr";

/**
 * Shared cookie hardening for every Supabase client (browser / server / proxy).
 *
 * WHY a single source: the auth session cookie is written from three places.
 * If they disagree on attributes the cookie definitions diverge and the session
 * can desync. Define the policy once; import it everywhere.
 *
 * What we set, and what we deliberately DON'T:
 *  - secure: HTTPS-only in production. NOT in dev — localhost is HTTP, and a
 *    `secure` cookie would simply be dropped there, breaking local sign-in.
 *  - cookieEncoding base64url: safe for every byte of the token across browsers.
 *  - httpOnly: LEFT at the library default (false). @supabase/ssr is a
 *    browser-readable token model — the client SDK must read the cookie in JS.
 *    Forcing httpOnly:true would silently break authentication. (Verified vs
 *    @supabase/ssr DEFAULT_COOKIE_OPTIONS.)
 *  - sameSite: already "lax" by default (CSRF protection) — not overridden.
 */
export const SUPABASE_COOKIE_OPTIONS: CookieOptionsWithName = {
  secure: process.env.NODE_ENV === "production",
};

export const SUPABASE_COOKIE_ENCODING = "base64url" as const;
