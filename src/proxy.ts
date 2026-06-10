import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAllowed } from "@/lib/auth/allowlist";
import { SUPABASE_COOKIE_ENCODING, SUPABASE_COOKIE_OPTIONS } from "@/lib/supabase/cookieOptions";

/**
 * Proxy (Next.js 16's renamed middleware) — the second access lock.
 * The first lock is the auth callback (runs once at login); this runs on EVERY
 * request, so a stale or pre-allowlist session token can't keep reaching
 * protected pages.
 *
 * On every non-public request two things must be true:
 *   1. There is a logged-in user (else → /login).
 *   2. That user is allowlisted (else → /login?error=denied).
 *
 * WHY getUser (not getSession): getUser re-validates the token with Supabase;
 * getSession trusts the cookie. For an auth GATE we want the validated identity.
 *
 * COOKIE SYNC (do not "simplify"): the getAll/setAll dance + returning the same
 * response object keeps the refreshed session cookie in sync between request and
 * response. Building a fresh response without copying cookies can silently log the
 * user out. (Verified against @supabase/ssr ^0.6.1 + Next 16 proxy convention.)
 *
 * NOTE: Next 16 deprecated `middleware.ts`/`export middleware` in favor of
 * `proxy.ts`/`export proxy` (nodejs runtime, no edge). This file IS the gate.
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: SUPABASE_COOKIE_OPTIONS,
      cookieEncoding: SUPABASE_COOKIE_ENCODING,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>,
        ) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(
              name,
              value,
              options as Parameters<typeof supabaseResponse.cookies.set>[2],
            ),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and getUser — keeps session refresh reliable.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = pathname.startsWith("/login") || pathname.startsWith("/auth");

  if (!isPublic) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    if (!isAllowed(user.email)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "denied");
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  // Everything except static assets. API/data routes ARE included so a direct
  // request to a data endpoint also passes the session + allowlist gate.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
