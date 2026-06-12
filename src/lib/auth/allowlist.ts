/**
 * Access allowlist — the front-door lock for Ledger.
 *
 * WHY THIS EXISTS:
 * Ledger holds a real person's (Adriane's) financial data. Google OAuth on its own
 * lets ANY Google account obtain a session — that is not acceptable here. This module
 * is the gate: only three explicitly-listed accounts may enter, each mapped to a role.
 * Everyone else is denied.
 *
 * WHY ENV VARS (not a committed constant):
 * The email list is configuration, not code. Keeping it in env vars (set host-side on
 * Vercel) means the real addresses never live in the repo / GitHub, and the list can be
 * changed without a code change. These are read server-side only — never NEXT_PUBLIC_,
 * so they are never shipped to the browser bundle.
 *
 * WHY NORMALIZE:
 * Gmail ignores dots and is case-insensitive: "Jackson.Dev@gmail.com",
 * "jacksondev@gmail.com", and "JACKSONDEV@GMAIL.COM" are the SAME inbox. If we compared
 * raw strings, an allowlisted user could be wrongly denied, or a near-match could slip
 * through. Normalizing both sides (lowercase, strip dots in the local part for gmail)
 * makes the check robust.
 */

export type Role = "admin" | "user" | "test";

/**
 * Normalize an email for comparison. Lowercases everything; for gmail/googlemail
 * addresses also strips dots AND any "+tag" from the local part — Gmail treats
 * "a.b+anything@gmail.com" and "ab@gmail.com" as the same inbox.
 */
export function normalizeEmail(raw: string): string {
  const email = raw.trim().toLowerCase();
  const atIndex = email.lastIndexOf("@");
  if (atIndex === -1) return email;

  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);

  if (domain === "gmail.com" || domain === "googlemail.com") {
    // Drop the "+tag" alias first, then the dots Gmail ignores.
    const base = local.split("+")[0].replace(/\./g, "");
    return `${base}@${domain}`;
  }
  return `${local}@${domain}`;
}

/**
 * Build the role map from env vars at call time (not module load) so tests and
 * deploys can vary the env without a stale snapshot. Missing vars simply mean that
 * role has no account — fail CLOSED (no entry), never fail open.
 */
function roleMap(): Map<string, Role> {
  const map = new Map<string, Role>();
  const add = (raw: string | undefined, role: Role) => {
    if (raw && raw.trim()) map.set(normalizeEmail(raw), role);
  };
  add(process.env.LEDGER_ADMIN_EMAIL, "admin");
  add(process.env.LEDGER_USER_EMAIL, "user");
  add(process.env.LEDGER_TEST_EMAIL, "test");
  return map;
}

/**
 * Resolve an email to its role, or null if not allowlisted.
 * Returns null on empty/garbage input — callers treat null as "deny".
 */
export function roleForEmail(email: string | null | undefined): Role | null {
  if (!email) return null;
  return roleMap().get(normalizeEmail(email)) ?? null;
}

/** True only if the email maps to one of the three allowed accounts. */
export function isAllowed(email: string | null | undefined): boolean {
  return roleForEmail(email) !== null;
}
