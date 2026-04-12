import React from "react";
import { render, screen } from "@testing-library/react";
import { PayeeReductionPlanner } from "./PayeeReductionPlanner";
import type { InstallmentPlan } from "@/types";
import { getAffirmTotalForMonth } from "@/lib/affirm/affirm";

jest.mock("@/lib/dates/dates", () => ({
  ...jest.requireActual("@/lib/dates/dates"),
  currentMonth: jest.fn(() => "2026-04"),
}));

jest.mock("@/lib/affirm/affirm", () => ({
  getAffirmTotalForMonth: jest.fn(),
}));

// Avoid pulling Recharts into jsdom
jest.mock("./AffirmBurdenChart", () => ({
  AffirmBurdenChart: () => null,
}));

jest.mock("@/components/shared/InsightCard", () => ({
  InsightCard: () => null,
}));

jest.mock("@/lib/insights/debtInsights", () => ({
  affirmPayoffInsights: jest.fn(() => []),
}));

const mockGetAffirm = getAffirmTotalForMonth as jest.Mock;

// ── fixture plans ──────────────────────────────────────────────────────────
const PLAN_A: InstallmentPlan = {
  id: "plan-a",
  label: "Samsung TV",
  mc: 15000, // $150.00/mo
  start: "2025-10",
  end: "2026-06",
};

const PLAN_B: InstallmentPlan = {
  id: "plan-b",
  label: "MacBook",
  mc: 20000, // $200.00/mo
  start: "2025-08",
  end: "2026-08",
};

const PLAN_FINAL: InstallmentPlan = {
  id: "plan-final",
  label: "AirPods",
  mc: 5000,
  start: "2026-01",
  end: "2026-04", // ends current month
};

// ── helpers ────────────────────────────────────────────────────────────────

/** Simulate a step-down at each plan's end month. */
function stepMock(thresholds: Array<[string, number]>): jest.Mock {
  return mockGetAffirm.mockImplementation(
    (_plans: InstallmentPlan[], m: string) => {
      for (const [cutoff, val] of thresholds) {
        if (m < cutoff) return val;
      }
      return thresholds[thresholds.length - 1][1];
    },
  );
}

beforeEach(() => {
  // Default: flat burden — no milestone rows generated
  mockGetAffirm.mockReturnValue(50000);
});

// ── tests ──────────────────────────────────────────────────────────────────

describe("PayeeReductionPlanner", () => {
  it("renders empty state when no active plans", () => {
    const past: InstallmentPlan = {
      id: "past",
      label: "Old Plan",
      mc: 10000,
      start: "2025-01",
      end: "2026-03",
    };
    render(<PayeeReductionPlanner plans={[past]} />);
    expect(screen.getByText("All Affirm plans are paid off.")).toBeInTheDocument();
  });

  it("renders the section heading", () => {
    render(<PayeeReductionPlanner plans={[PLAN_A]} />);
    expect(screen.getByText("Affirm Payoff Timeline")).toBeInTheDocument();
  });

  it("renders current burden with /mo now suffix", () => {
    // mock returns 50000 cents = $500.00
    render(<PayeeReductionPlanner plans={[PLAN_A]} />);
    expect(screen.getByText(/\$500\.00\/mo now/)).toBeInTheDocument();
  });

  it("renders table headers when milestone rows exist", () => {
    // burden drops from $500.00 → $350.00 when PLAN_A ends in June
    stepMock([["2026-06", 50000], ["9999-99", 35000]]);
    render(<PayeeReductionPlanner plans={[PLAN_A]} />);
    expect(screen.getByText("When")).toBeInTheDocument();
    expect(screen.getByText("New burden")).toBeInTheDocument();
    expect(screen.getByText("Freed up")).toBeInTheDocument();
  });

  it("renders end date as milestone month label", () => {
    stepMock([["2026-06", 50000], ["9999-99", 35000]]);
    render(<PayeeReductionPlanner plans={[PLAN_A]} />);
    // fmtMonthLabel("2026-06") → "Jun '26" (short month, 2-digit year)
    expect(screen.getByText(/Jun.+26/)).toBeInTheDocument();
  });

  it("renders $0 for a row where burden reaches zero", () => {
    // entire burden ($500) clears in June
    stepMock([["2026-06", 50000], ["9999-99", 0]]);
    const fullPayoff: InstallmentPlan = {
      id: "full-payoff",
      label: "Full Payoff",
      mc: 50000,
      start: "2026-01",
      end: "2026-06",
    };
    render(<PayeeReductionPlanner plans={[fullPayoff]} />);
    expect(screen.getByText("$0")).toBeInTheDocument();
  });

  it("renders $0 for plan ending in the current month", () => {
    // PLAN_FINAL ends 2026-04 = current month; burden hits 0 that month
    mockGetAffirm.mockImplementation(
      (_plans: InstallmentPlan[], m: string) => (m === "2026-04" ? 0 : 50000),
    );
    render(<PayeeReductionPlanner plans={[PLAN_FINAL]} />);
    expect(screen.getByText("$0")).toBeInTheDocument();
  });

  it("renders freed-up amount with down-arrow in milestone row", () => {
    // relief = 50000 - 35000 = 15000 = $150.00
    stepMock([["2026-06", 50000], ["9999-99", 35000]]);
    render(<PayeeReductionPlanner plans={[PLAN_A]} />);
    expect(screen.getByText(/↓.*\$150\.00/)).toBeInTheDocument();
  });

  it("renders down-arrow indicator in freed up column", () => {
    stepMock([["2026-06", 50000], ["9999-99", 35000]]);
    render(<PayeeReductionPlanner plans={[PLAN_A]} />);
    expect(screen.getAllByText(/↓/).length).toBeGreaterThan(0);
  });

  it("renders milestone rows for multiple plans", () => {
    // $700 → $500 at June (PLAN_A drops) → $300 at August (PLAN_B drops)
    stepMock([["2026-06", 70000], ["2026-08", 50000], ["9999-99", 30000]]);
    render(<PayeeReductionPlanner plans={[PLAN_A, PLAN_B]} />);
    expect(screen.getByText(/Jun.+26/)).toBeInTheDocument();
    expect(screen.getByText(/Aug.+26/)).toBeInTheDocument();
  });

  it("renders Freed up column header", () => {
    stepMock([["2026-06", 50000], ["9999-99", 35000]]);
    render(<PayeeReductionPlanner plans={[PLAN_A]} />);
    expect(screen.getByText("Freed up")).toBeInTheDocument();
  });

  it("milestone months appear in chronological order", () => {
    stepMock([["2026-06", 70000], ["2026-08", 50000], ["9999-99", 30000]]);
    // Pass plans in reversed end-date order — component renders rows in chronological order
    render(<PayeeReductionPlanner plans={[PLAN_B, PLAN_A]} />);
    const cells = screen.getAllByText(/Jun.+26|Aug.+26/);
    const texts = cells.map((el) => el.textContent ?? "");
    const juneIdx = texts.findIndex((t) => /Jun/.test(t));
    const augIdx = texts.findIndex((t) => /Aug/.test(t));
    expect(juneIdx).toBeGreaterThanOrEqual(0);
    expect(augIdx).toBeGreaterThanOrEqual(0);
    expect(juneIdx).toBeLessThan(augIdx);
  });

  it("renders $0 label for final milestone when burden equals freed amount", () => {
    const singlePlan: InstallmentPlan = {
      id: "full-payoff",
      label: "Full Payoff Plan",
      mc: 50000, // equals the mocked total
      start: "2026-01",
      end: "2026-06",
    };
    stepMock([["2026-06", 50000], ["9999-99", 0]]);
    render(<PayeeReductionPlanner plans={[singlePlan]} />);
    expect(screen.getByText("$0")).toBeInTheDocument();
  });
});
