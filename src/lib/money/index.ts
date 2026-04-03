/**
 * Barrel export for the money module.
 *
 * WHY THIS FILE EXISTS:
 * All imports throughout the codebase use "@/lib/money" — not "@/lib/money/money".
 * This barrel re-exports everything so the internal file structure can change
 * without breaking any import paths. The folder's implementation is an
 * internal detail; this file is the public API.
 *
 * PATTERN: Named "barrel" export — like a barrel that packages goods for shipping.
 * The consumer doesn't care how the barrel is organized inside, only what comes out.
 */
export { toCents, fmtMoney, sumCents, calcShortfall } from "./money";
