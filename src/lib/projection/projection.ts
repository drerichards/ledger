import type { KiasCheckEntry } from "@/types";

/** Statistical baseline derived from Kia's check history. */
export type CheckBaseline = {
  average: number; // cents — mean weekly pay
  low: number; // cents — lowest recorded week
  high: number; // cents — highest recorded week
  sampleSize: number;
};

/**
 * Calculates the statistical baseline from Kia's check log.
 * Returns null if there is no data yet.
 */
export function calcCheckBaseline(log: KiasCheckEntry[]): CheckBaseline | null {
  if (log.length === 0) return null;

  const amounts = log.map((e) => e.amount);
  const total = amounts.reduce((sum, amt) => sum + amt, 0);

  return {
    average: Math.round(total / amounts.length),
    low: Math.min(...amounts),
    high: Math.max(...amounts),
    sampleSize: amounts.length,
  };
}

export type ProjectionScenario = "conservative" | "average" | "optimistic";

export function getWeeklyBaseline(
  baseline: CheckBaseline,
  scenario: ProjectionScenario,
): number {
  switch (scenario) {
    case "conservative":
      return baseline.low;
    case "average":
      return baseline.average;
    case "optimistic":
      return baseline.high;
  }
}

/**
 * Projects monthly income from Kia's pay given a weekly baseline.
 * Defaults to 4 weeks — the conservative floor.
 */
export function projectMonthlyKiasPay(
  weeklyBaseline: number,
  weeksInMonth = 4,
): number {
  return weeklyBaseline * weeksInMonth;
}
