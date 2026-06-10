import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_COOKIE_ENCODING, SUPABASE_COOKIE_OPTIONS } from "./cookieOptions";

/**
 * Browser-side Supabase client.
 * Safe to call from any Client Component — creates a new instance per call
 * (stateless; @supabase/ssr handles cookie management internally).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: SUPABASE_COOKIE_OPTIONS,
      cookieEncoding: SUPABASE_COOKIE_ENCODING,
    },
  );
}
