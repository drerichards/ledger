/**
 * Barrel export for the dates module.
 *
 * WHY THIS FILE EXISTS:
 * All imports use "@/lib/dates" — this re-exports the public API so that
 * moving dates.ts into its own folder doesn't break any import paths.
 */
export {
  currentMonth,
  today,
  fmtMonthLabel,
  fmtMonthFull,
  monthsBetween,
  getMonthRange,
  getMondayOf,
  getMondaysInMonth,
  mondayOf,
  advanceMonth,
  getFridaysInMonth,
  getFridaysUpToMonth,
  getMondaysUpToMonth,
} from "./dates";
