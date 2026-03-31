import {
  calcCheckBaseline,
  getWeeklyBaseline,
  projectMonthlyKiasPay,
} from "@/lib/projection";
import type { KiasCheckEntry } from "@/types";

function makeEntry(amount: number): KiasCheckEntry {
  return { weekOf: "2026-04-06", amount };
}

describe("calcCheckBaseline", () => {
  it("returns null for empty log", () => {
    expect(calcCheckBaseline([])).toBeNull();
  });

  it("calculates correct stats for a single entry", () => {
    const result = calcCheckBaseline([makeEntry(80000)]);
    expect(result).toEqual({
      average: 80000,
      low: 80000,
      high: 80000,
      sampleSize: 1,
    });
  });

  it("calculates average, low, high, and sampleSize", () => {
    const log = [makeEntry(70000), makeEntry(80000), makeEntry(90000)];
    const result = calcCheckBaseline(log);
    expect(result?.average).toBe(80000);
    expect(result?.low).toBe(70000);
    expect(result?.high).toBe(90000);
    expect(result?.sampleSize).toBe(3);
  });

  it("rounds average to nearest cent", () => {
    // 3 entries that don't divide evenly
    const log = [makeEntry(100), makeEntry(200), makeEntry(300)];
    const result = calcCheckBaseline(log);
    // (100 + 200 + 300) / 3 = 200 exactly
    expect(result?.average).toBe(200);
  });

  it("handles entries with identical amounts", () => {
    const log = [makeEntry(76423), makeEntry(76423)];
    const result = calcCheckBaseline(log);
    expect(result?.average).toBe(76423);
    expect(result?.low).toBe(76423);
    expect(result?.high).toBe(76423);
  });
});

describe("getWeeklyBaseline", () => {
  const baseline = { average: 80000, low: 60000, high: 100000, sampleSize: 5 };

  it("returns low for conservative scenario", () => {
    expect(getWeeklyBaseline(baseline, "conservative")).toBe(60000);
  });

  it("returns average for average scenario", () => {
    expect(getWeeklyBaseline(baseline, "average")).toBe(80000);
  });

  it("returns high for optimistic scenario", () => {
    expect(getWeeklyBaseline(baseline, "optimistic")).toBe(100000);
  });
});

describe("projectMonthlyKiasPay", () => {
  it("defaults to 4 weeks per month", () => {
    expect(projectMonthlyKiasPay(80000)).toBe(320000);
  });

  it("respects a custom week count", () => {
    expect(projectMonthlyKiasPay(80000, 5)).toBe(400000);
  });

  it("returns 0 for a 0 baseline", () => {
    expect(projectMonthlyKiasPay(0)).toBe(0);
  });
});
