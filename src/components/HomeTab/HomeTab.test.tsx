import { render, screen, fireEvent } from "@testing-library/react";
import { HomeTab } from "@/components/HomeTab/HomeTab";
import type { Bill, InstallmentPlan, SavingsEntry, SavingsGoal } from "@/types";

// today() drives the week/month math — pin it so cash-flow ranges are deterministic.
jest.mock("@/lib/dates", () => ({
  ...jest.requireActual("@/lib/dates"),
  today: jest.fn(() => "2026-04-15"),
}));

// ─── Factories ──────────────────────────────────────────────────────────────

function makeBill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: "b1",
    month: "2026-04",
    name: "Verizon",
    cents: 10800,
    due: 20,
    paid: false,
    method: "autopay",
    group: "kias_pay",
    entry: "recurring",
    category: "Utilities",
    flagged: false,
    notes: "",
    amountHistory: [],
    ...overrides,
  };
}

const noop = () => {};

type RenderOverrides = {
  checkingBalance?: number;
  bills?: Bill[];
  plans?: InstallmentPlan[];
  savingsLog?: SavingsEntry[];
  onTogglePaid?: (id: string) => void;
  goals?: SavingsGoal[];
};

function renderHome(overrides: RenderOverrides = {}) {
  return render(
    <HomeTab
      checkingBalance={overrides.checkingBalance ?? 150000}
      checkingBalanceDate="2026-04-10"
      bankAccounts={[]}
      bills={overrides.bills ?? []}
      income={[]}
      plans={overrides.plans ?? []}
      paycheck={[]}
      checkLog={[]}
      savingsLog={overrides.savingsLog ?? []}
      goals={overrides.goals ?? []}
      onSetBalance={noop}
      onAddBankAccount={noop}
      onUpdateBankAccount={noop}
      onDeleteBankAccount={noop}
      onTogglePaid={overrides.onTogglePaid ?? noop}
    />,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("HomeTab — bento tiles render", () => {
  it("renders the verdict tile with THE ANSWER and a bills-handled progress bar", () => {
    renderHome({ bills: [makeBill({ id: "x", paid: true }), makeBill({ id: "y" })] });
    expect(screen.getByText("THE ANSWER")).toBeInTheDocument();
    expect(screen.getByText(/bills handled this month/)).toBeInTheDocument();
  });

  it("renders the action strip (Next bill / Next paycheck)", () => {
    renderHome();
    expect(screen.getByText("Next bill to pay")).toBeInTheDocument();
    expect(screen.getByText("Next paycheck")).toBeInTheDocument();
  });

  it("renders the spending donut tile", () => {
    renderHome({ bills: [makeBill({ category: "Housing", cents: 50000 })] });
    expect(screen.getByText("Where your money goes")).toBeInTheDocument();
  });

  it("renders the week rail with 7 day cards", () => {
    renderHome();
    // ("This week" also appears as the action-strip overdue label — assert the
    // day cards instead, which are unique to the rail.)
    expect(screen.getByText("Mon")).toBeInTheDocument();
    expect(screen.getByText("Wed")).toBeInTheDocument();
    expect(screen.getByText("Sun")).toBeInTheDocument();
  });

  it("renders the day-detail tile with a balance footer", () => {
    renderHome();
    expect(screen.getByText("Balance after this day")).toBeInTheDocument();
  });

  it("renders the momentum gauges tile", () => {
    renderHome();
    expect(screen.getByText("Momentum")).toBeInTheDocument();
    expect(screen.getByText("Bills handled")).toBeInTheDocument();
  });
});

describe("HomeTab — interactions", () => {
  it("selecting a day in the rail updates the day-detail tile", () => {
    renderHome();
    fireEvent.click(screen.getByText("Mon"));
    expect(screen.getAllByText(/Mon ·/).length).toBeGreaterThan(0);
  });

  it("shows a bill on its due day in the detail when that day is selected", () => {
    // today is 2026-04-15 (Wed); a bill due the 14th lands Tue this week.
    renderHome({ bills: [makeBill({ name: "Verizon", due: 14, method: "transfer" })] });
    fireEvent.click(screen.getByText("Tue"));
    expect(screen.getAllByText("Verizon").length).toBeGreaterThan(0);
  });

  it("fires onTogglePaid from the day-detail Mark paid button", () => {
    const onTogglePaid = jest.fn();
    renderHome({
      bills: [makeBill({ id: "vz", name: "Verizon", due: 14, method: "transfer" })],
      onTogglePaid,
    });
    fireEvent.click(screen.getByText("Tue"));
    fireEvent.click(screen.getByRole("button", { name: "Mark paid" }));
    expect(onTogglePaid).toHaveBeenCalledWith("vz");
  });

  it("shows goal progress in the gauges when a goal + savings exist", () => {
    renderHome({
      goals: [
        { id: "g1", label: "Car fund", targetCents: 500000, targetDate: "2026-12", createdAt: "2026-01-01" },
      ],
      savingsLog: [{ id: "s1", date: "2026-04-01", amount: 350000 }],
    });
    expect(screen.getByText("Car fund")).toBeInTheDocument();
    expect(screen.getByText("70%")).toBeInTheDocument();
  });
});
