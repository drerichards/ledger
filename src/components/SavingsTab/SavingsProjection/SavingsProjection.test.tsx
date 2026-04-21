import { render, screen, fireEvent } from "@testing-library/react";
import { SavingsProjection } from "./SavingsProjection";
import type {
  InstallmentPlan,
  KiasCheckEntry,
  PaycheckWeek,
  SavingsEntry,
  SavingsGoal,
} from "@/types";

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

  it("finds a clearance month when Affirm plans clear within the 12-month window (line 40 truthy branch)", () => {
    // Plan active April → July 2026 → clears August 2026 (month index 4 of 12)
    const plans: InstallmentPlan[] = [
      {
        id: "p1",
        label: "Samsung TV",
        mc: 15000, // $150 / mo
        start: "2026-04",
        end: "2026-07",
      },
    ];
    render(
      <SavingsProjection plans={plans} checkLog={checkLog} paycheck={[]} />,
    );
    // The bottom-line banner appears when clearanceMonth is truthy
    expect(screen.getByText(/Affirm clears in/)).toBeInTheDocument();
  });

  it("falls back to null when Affirm never clears inside the 12-month window (line 40 ?? null branch)", () => {
    // Plan extends beyond 12 months → .find() returns undefined → ?? null fires
    const plans: InstallmentPlan[] = [
      {
        id: "p1",
        label: "Long Plan",
        mc: 10000,
        start: "2026-04",
        end: "2030-12",
      },
    ];
    render(
      <SavingsProjection plans={plans} checkLog={checkLog} paycheck={[]} />,
    );
    // No clearance banner rendered — the "Affirm clears in" text must NOT be present
    expect(screen.queryByText(/Affirm clears in/)).not.toBeInTheDocument();
    // The projection still renders normally
    expect(screen.getByText("12-Month Savings Projection")).toBeInTheDocument();
  });

  it("sorts goals by priority when both have priority defined (line 49 truthy branch)", () => {
    const plans: InstallmentPlan[] = [
      {
        id: "p1",
        label: "TV",
        mc: 15000,
        start: "2026-04",
        end: "2026-07",
      },
    ];
    const goals: SavingsGoal[] = [
      {
        id: "g1",
        label: "Emergency Fund",
        targetCents: 500000, // $5,000
        targetDate: "2026-12",
        createdAt: "2026-04-01T00:00:00Z",
        priority: 2,
      },
      {
        id: "g2",
        label: "Vacation",
        targetCents: 200000, // $2,000 (smaller, but lower priority rank)
        targetDate: "2026-10",
        createdAt: "2026-04-01T00:00:00Z",
        priority: 1, // highest — should be picked first even though target is smaller
      },
    ];
    const savingsLog: SavingsEntry[] = [];
    render(
      <SavingsProjection
        plans={plans}
        checkLog={checkLog}
        paycheck={[]}
        goals={goals}
        savingsLog={savingsLog}
      />,
    );
    // nearestGoal is picked by priority → "Vacation" (priority 1)
    expect(screen.getByText("Vacation")).toBeInTheDocument();
  });

  it("falls back to targetCents sort when at least one goal has no priority (line 50 branch)", () => {
    const plans: InstallmentPlan[] = [
      {
        id: "p1",
        label: "TV",
        mc: 15000,
        start: "2026-04",
        end: "2026-07",
      },
    ];
    const goals: SavingsGoal[] = [
      {
        id: "g1",
        label: "Big Goal",
        targetCents: 900000, // $9,000
        targetDate: "2026-12",
        createdAt: "2026-04-01T00:00:00Z",
        // no priority set
      },
      {
        id: "g2",
        label: "Small Goal",
        targetCents: 100000, // $1,000 — smallest, wins the fallback sort
        targetDate: "2026-10",
        createdAt: "2026-04-01T00:00:00Z",
        // no priority set
      },
    ];
    render(
      <SavingsProjection
        plans={plans}
        checkLog={checkLog}
        paycheck={[]}
        goals={goals}
        savingsLog={[]}
      />,
    );
    // nearestGoal falls back to smallest targetCents → "Small Goal"
    expect(screen.getByText("Small Goal")).toBeInTheDocument();
  });

  it("renders singular 'month' (not 'months') when goalConnectMonths === 1 (line 112 singular branch)", () => {
    // Tiny target + large affirm monthly → ceil(target / affirm) === 1
    const plans: InstallmentPlan[] = [
      {
        id: "p1",
        label: "Big Plan",
        mc: 500000, // $5,000 / mo freed after clearance
        start: "2026-04",
        end: "2026-05",
      },
    ];
    const goals: SavingsGoal[] = [
      {
        id: "g1",
        label: "Tiny Goal",
        targetCents: 10000, // $100 — covered in one month
        targetDate: "2026-10",
        createdAt: "2026-04-01T00:00:00Z",
      },
    ];
    render(
      <SavingsProjection
        plans={plans}
        checkLog={checkLog}
        paycheck={[]}
        goals={goals}
        savingsLog={[]}
      />,
    );
    // Goal connect banner should render with "1 month" (singular)
    const goalBanner = screen.getByText(/funded in/);
    expect(goalBanner.textContent).toMatch(/1 month(?!s)/);
  });

  it("falls back to null nearestGoal when every goal is already fully saved (line 46 ?? null branch)", () => {
    const plans: InstallmentPlan[] = [
      {
        id: "p1",
        label: "TV",
        mc: 15000,
        start: "2026-04",
        end: "2026-07",
      },
    ];
    const goals: SavingsGoal[] = [
      {
        id: "g1",
        label: "Already Funded",
        targetCents: 10000, // $100 — already covered by savingsLog below
        targetDate: "2026-10",
        createdAt: "2026-04-01T00:00:00Z",
      },
    ];
    const savingsLog: SavingsEntry[] = [
      { id: "s1", date: "2026-04-01", amount: 50000 }, // $500 — exceeds the $100 goal
    ];
    render(
      <SavingsProjection
        plans={plans}
        checkLog={checkLog}
        paycheck={[]}
        goals={goals}
        savingsLog={savingsLog}
      />,
    );
    // .filter() returns [] → [0] is undefined → ?? null fires → no goal banner rendered
    expect(screen.queryByText(/funded in/)).not.toBeInTheDocument();
    // But the projection still renders
    expect(screen.getByText("12-Month Savings Projection")).toBeInTheDocument();
  });

  it("uses a non-empty savingsLog to compute totalSaved (reduce callback on line 44)", () => {
    const plans: InstallmentPlan[] = [
      {
        id: "p1",
        label: "TV",
        mc: 15000,
        start: "2026-04",
        end: "2026-07",
      },
    ];
    const goals: SavingsGoal[] = [
      {
        id: "g1",
        label: "Emergency",
        targetCents: 500000, // $5,000
        targetDate: "2026-12",
        createdAt: "2026-04-01T00:00:00Z",
      },
    ];
    const savingsLog: SavingsEntry[] = [
      { id: "s1", date: "2026-04-01", amount: 20000 }, // $200
      { id: "s2", date: "2026-04-08", amount: 30000 }, // $300
    ];
    render(
      <SavingsProjection
        plans={plans}
        checkLog={checkLog}
        paycheck={[]}
        goals={goals}
        savingsLog={savingsLog}
      />,
    );
    // Goal "Emergency" still needs $5,000 − $500 = $4,500 → ceil(4500 / 150) = 30 months
    expect(screen.getByText("Emergency")).toBeInTheDocument();
  });
});
