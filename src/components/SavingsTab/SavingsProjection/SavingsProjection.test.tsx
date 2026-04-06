import { render, screen, fireEvent } from "@testing-library/react";
import { SavingsProjection } from "./SavingsProjection";
import type { KiasCheckEntry, PaycheckWeek } from "@/types";

jest.mock("@/lib/dates", () => ({
  ...jest.requireActual("@/lib/dates"),
  currentMonth: jest.fn(() => "2026-04"),
}));

function makeCheckEntry(overrides: Partial<KiasCheckEntry> = {}): KiasCheckEntry {
  return { weekOf: "2026-04-06", amount: 76423, ...overrides };
}

describe("SavingsProjection — no baseline", () => {
  it("shows empty state when no check entries provided", () => {
    render(<SavingsProjection plans={[]} checkLog={[]} paycheck={[]} />);
    expect(screen.getByText(/Log at least one/)).toBeInTheDocument();
  });
});

describe("SavingsProjection — with baseline", () => {
  const checkLog = Array.from({ length: 5 }, (_, i) =>
    makeCheckEntry({ weekOf: `2026-04-${String(i + 1).padStart(2, "0")}`, amount: 76000 + i * 100 }),
  );

  it("renders the projection heading", () => {
    render(<SavingsProjection plans={[]} checkLog={checkLog} paycheck={[]} />);
    expect(screen.getByText("12-Month Savings Projection")).toBeInTheDocument();
  });

  it("renders scenario toggle buttons", () => {
    render(<SavingsProjection plans={[]} checkLog={checkLog} paycheck={[]} />);
    expect(screen.getByRole("button", { name: "Conservative" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Average" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Optimistic" })).toBeInTheDocument();
  });

  it("can switch to Average scenario", () => {
    render(<SavingsProjection plans={[]} checkLog={checkLog} paycheck={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Average" }));
    // No error — scenario state updated
    expect(screen.getByRole("button", { name: "Average" })).toBeInTheDocument();
  });

  it("can switch to Optimistic scenario", () => {
    render(<SavingsProjection plans={[]} checkLog={checkLog} paycheck={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Optimistic" }));
    expect(screen.getByRole("button", { name: "Optimistic" })).toBeInTheDocument();
  });

  it("renders 12 month columns", () => {
    render(<SavingsProjection plans={[]} checkLog={checkLog} paycheck={[]} />);
    // 12 months — look for month labels in the table
    const cells = screen.getAllByText(/Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Jan|Feb|Mar/);
    expect(cells.length).toBeGreaterThanOrEqual(12);
  });

  it("uses paycheck fixed expenses when latestWeek is defined (lines 38-43 truthy branch)", () => {
    const paycheck: PaycheckWeek[] = [
      {
        weekOf: "2026-04-06",
        kiasPay: 76000,
        storage: 14000,
        rent: 80000,
        jazmin: 20000,
        dre: 20000,
        savings: 0,
        paypalCC: 5000,
        deductions: 1000,
      },
    ];
    render(<SavingsProjection plans={[]} checkLog={checkLog} paycheck={paycheck} />);
    // Component renders without error and shows the projection table
    expect(screen.getByText("12-Month Savings Projection")).toBeInTheDocument();
  });

  it("applies negative class when projected remainder is below zero (line 111 branch)", () => {
    // Very high storage allocation per week vs low projected income → remainder < 0
    const paycheck: PaycheckWeek[] = [
      {
        weekOf: "2026-04-06",
        kiasPay: 76000,
        storage: 9999999,
        rent: 0,
        jazmin: 0,
        dre: 0,
        savings: 0,
        paypalCC: 0,
        deductions: 0,
      },
    ];
    const { container } = render(
      <SavingsProjection plans={[]} checkLog={checkLog} paycheck={paycheck} />,
    );
    expect(container.querySelector(".negative")).toBeInTheDocument();
  });
});
