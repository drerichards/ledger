import type { NextConfig } from "next";

/**
 * Content Security Policy.
 *
 * Tradeoffs documented inline:
 * - 'unsafe-inline' in script-src: required for Next.js client hydration
 *   (inline event handlers + style props). Remove once nonce-based CSP is set up.
 * - 'unsafe-eval' in script-src: required by Next.js dev mode only.
 *   Production Next.js does not use eval, but this header is shared across envs.
 * - Supabase URL in connect-src: allows fetch/WebSocket to the project endpoint.
 * - accounts.google.com in form-action: required for Google OAuth redirect flow.
 */
const supabaseHostname = "htonsvjolkcehzwmqgpa.supabase.co";

const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https: blob:;
  connect-src 'self' https://${supabaseHostname} wss://${supabaseHostname};
  frame-src 'none';
  frame-ancestors 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self' https://accounts.google.com;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const securityHeaders = [
  { key: "Content-Security-Policy", value: ContentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // HSTS: 1-year max-age. Browsers ignore this on plain HTTP — safe to always include.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
