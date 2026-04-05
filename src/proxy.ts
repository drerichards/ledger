import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Proxy (formerly middleware) — runs on every matched request.
 * Currently a passthrough; exists to generate proxy-manifest.json for Turbopack.
 */
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
