import React from "react";
import { render, screen } from "@testing-library/react";
import { PayeeReductionPlanner } from "./PayeeReductionPlanner";
import type { InstallmentPlan } from "@/types";

jest.mock("@/lib/dates", () => ({
  ...jest.requireActual("@/lib/dates"),
  currentMonth: jest.fn(() => "2026-04"),
}));

jest.mock("@/lib/affirm", () => ({
  getAffirmTotalForMonth: jest.fn(() => 50000),
}));

const PLAN_A: InstallmentPlan = {
  id: "plan-a",
  label: "Samsung TV",
  mc: 15000,
  start: "2025-10",
  end: "2026-06",
};

const PLAN_B: InstallmentPlan = {
  id: "plan-b",
  label: "MacBook",
  mc: 20000,
  start: "2025-08",
  end: "2026-08",
};

const PLAN_FINAL: InstallmentPlan = {
  id: "plan-final",
  label: "AirPods",
  mc: 5000,
  start: "2026-01",
  end: "2026-04",
};

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

  it("renders current burden subtitle", () => {
    render(<PayeeReductionPlanner plans={[PLAN_A]} />);
    expect(screen.getByText(/Current burden/)).toBeInTheDocument();
  });

  it("renders plan label", () => {
    render(<PayeeReductionPlanner plans={[PLAN_A]} />);
    expect(screen.getByText("Samsung TV")).toBeInTheDocument();
  });

  it("renders end date for a plan", () => {
    render(<PayeeReductionPlanner plans={[PLAN_A]} />);
    // "June 2026" appears in the card AND the projection milestone row
    expect(screen.getAllByText("June 2026").length).toBeGreaterThanOrEqual(1);
  });

  it("renders FINAL badge for plan ending this month", () => {
    render(<PayeeReductionPlanner plans={[PLAN_FINAL]} />);
    expect(screen.getByText("FINAL")).toBeInTheDocument();
  });

  it("renders 'Last month' for plan ending this month", () => {
    render(<PayeeReductionPlanner plans={[PLAN_FINAL]} />);
    expect(screen.getByText("Last month")).toBeInTheDocument();
  });

  it("renders months left for future plans", () => {
    render(<PayeeReductionPlanner plans={[PLAN_A]} />);
    // PLAN_A ends 2026-06, current is 2026-04
    // monthsBetween is inclusive: (2026-04 → 2026-06) = 3
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders freed amount for each plan", () => {
    render(<PayeeReductionPlanner plans={[PLAN_A]} />);
    // mc = 15000 cents = $150.00
    expect(screen.getByText("$150.00/mo")).toBeInTheDocument();
  });

  it("renders multiple plans", () => {
    render(<PayeeReductionPlanner plans={[PLAN_A, PLAN_B]} />);
    expect(screen.getByText("Samsung TV")).toBeInTheDocument();
    expect(screen.getByText("MacBook")).toBeInTheDocument();
  });

  it("renders cumulative payoff section", () => {
    render(<PayeeReductionPlanner plans={[PLAN_A]} />);
    expect(screen.getByText("Cumulative Payoff")).toBeInTheDocument();
  });

  it("renders milestone rows with arrow separator", () => {
    render(<PayeeReductionPlanner plans={[PLAN_A]} />);
    expect(screen.getAllByText("→").length).toBeGreaterThan(0);
  });

  it("plans are sorted by end date ascending", () => {
    render(<PayeeReductionPlanner plans={[PLAN_B, PLAN_A]} />);
    const labels = screen.getAllByText(/Samsung TV|MacBook/);
    // Samsung TV ends 2026-06, MacBook ends 2026-08 — Samsung first
    expect(labels[0].textContent).toBe("Samsung TV");
    expect(labels[1].textContent).toBe("MacBook");
  });

  it("renders $0 label for final milestone when burden equals freed amount", () => {
    // The mock returns 50000 as the total burden; use a plan with mc=50000 so burden drops to $0
    const singlePlan: InstallmentPlan = {
      id: "full-payoff",
      label: "Full Payoff Plan",
      mc: 50000, // equals the mocked getAffirmTotalForMonth return value
      start: "2026-01",
      end: "2026-06",
    };
    render(<PayeeReductionPlanner plans={[singlePlan]} />);
    expect(screen.getByText("$0")).toBeInTheDocument();
  });
});
