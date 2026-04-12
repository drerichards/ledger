import { render, screen, fireEvent, within } from "@testing-library/react";
import { MonthSnapshot } from "./MonthSnapshot";
import type { Bill, KiasCheckEntry, MonthlyIncome, MonthSnapshot as MonthSnapshotType, SavingsEntry } from "@/types";

// ─── Factories ────────────────────────────────────────────────────────────────

function makeBill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: "b1",
    month: "2026-04",
    name: "T-Mobile",
    cents: 10800,
    due: 15,
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

function makeIncome(overrides: Partial<MonthlyIncome> = {}): MonthlyIncome {
  return {
    month: "2026-04",
    kias_pay: 200000,
    military_pay: 50000,
    retirement: 30000,
    social_security: 20000,
    ...overrides,
  };
}

function makeSavingsEntry(overrides: Partial<SavingsEntry> = {}): SavingsEntry {
  return { id: "s1", date: "2026-04-06", amount: 5000, ...overrides };
}

function makeCheckEntry(overrides: Partial<KiasCheckEntry> = {}): KiasCheckEntry {
  return { weekOf: "2026-04-06", amount: 76423, ...overrides };
}

const noop = () => {};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("MonthSnapshot — rendering", () => {
  it("renders the month label", () => {
    render(
      <MonthSnapshot
        month="2026-04"
        bills={[]}
        income={[]}
        savingsLog={[]}
        checkLog={[]}
        onSave={noop}
        onClose={noop}
      />,
    );
    expect(screen.getByText(/April 2026/)).toBeInTheDocument();
  });

  it("renders Total Billed stat", () => {
    const bills = [makeBill({ cents: 10800 }), makeBill({ id: "b2", cents: 5000 })];
    render(
      <MonthSnapshot
        month="2026-04"
        bills={bills}
        income={[]}
        savingsLog={[]}
        checkLog={[]}
        onSave={noop}
        onClose={noop}
      />,
    );
    expect(screen.getByText("Total Billed")).toBeInTheDocument();
    // With zero income, shortfall = totalBilled, so "$158.00" appears in both
    // the "Total Billed" stat and the "Short" stat. Scope to the label's container.
    const totalBilledLabel = screen.getByText("Total Billed");
    expect(within(totalBilledLabel.closest("div")!).getByText("$158.00")).toBeInTheDocument();
  });

  it("renders shortfall label when billed exceeds income", () => {
    const bills = [makeBill({ cents: 300000 })]; // $3,000
    const income = [makeIncome({ kias_pay: 200000, military_pay: 0, retirement: 0, social_security: 0 })]; // $2,000
    render(
      <MonthSnapshot
        month="2026-04"
        bills={bills}
        income={income}
        savingsLog={[]}
        checkLog={[]}
        onSave={noop}
        onClose={noop}
      />,
    );
    expect(screen.getByText("Short")).toBeInTheDocument();
  });

  it("renders surplus label when income exceeds billed", () => {
    const bills = [makeBill({ cents: 10000 })]; // $100
    const income = [makeIncome({ kias_pay: 500000, military_pay: 0, retirement: 0, social_security: 0 })];
    render(
      <MonthSnapshot
        month="2026-04"
        bills={bills}
        income={income}
        savingsLog={[]}
        checkLog={[]}
        onSave={noop}
        onClose={noop}
      />,
    );
    expect(screen.getByText("Surplus")).toBeInTheDocument();
  });

  it("renders Cancel and Confirm buttons", () => {
    render(
      <MonthSnapshot
        month="2026-04"
        bills={[]}
        income={[]}
        savingsLog={[]}
        checkLog={[]}
        onSave={noop}
        onClose={noop}
      />,
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Confirm/i })).toBeInTheDocument();
  });
});

describe("MonthSnapshot — actions", () => {
  it("calls onClose when Cancel is clicked", () => {
    const onClose = jest.fn();
    render(
      <MonthSnapshot
        month="2026-04"
        bills={[]}
        income={[]}
        savingsLog={[]}
        checkLog={[]}
        onSave={noop}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onSave and onClose when Confirm is clicked", () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    const bills = [makeBill({ cents: 10800, paid: true })];
    render(
      <MonthSnapshot
        month="2026-04"
        bills={bills}
        income={[]}
        savingsLog={[]}
        checkLog={[]}
        onSave={onSave}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Confirm/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("passes correct snapshot data to onSave", () => {
    const onSave = jest.fn();
    const bills = [
      makeBill({ id: "b1", cents: 10800, paid: true }),
      makeBill({ id: "b2", cents: 5000, paid: false }),
    ];
    const income = [makeIncome({ kias_pay: 200000, military_pay: 0, retirement: 0, social_security: 0 })];
    const savingsLog = [makeSavingsEntry({ amount: 3000 })];
    const checkLog = [makeCheckEntry({ amount: 76423 })];

    render(
      <MonthSnapshot
        month="2026-04"
        bills={bills}
        income={income}
        savingsLog={savingsLog}
        checkLog={checkLog}
        onSave={onSave}
        onClose={noop}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Confirm/i }));

    const snap: MonthSnapshotType = onSave.mock.calls[0][0];
    expect(snap.month).toBe("2026-04");
    expect(snap.totalBilled).toBe(15800);
    expect(snap.totalPaid).toBe(10800);
    expect(snap.savingsMoved).toBe(3000);
    expect(snap.kiasPayActual).toBe(76423);
  });
});

describe("MonthSnapshot — canSave gate", () => {
  it("disables Confirm button and shows warning when no bills exist", () => {
    render(
      <MonthSnapshot
        month="2026-04"
        bills={[]}
        income={[]}
        savingsLog={[]}
        checkLog={[]}
        onSave={noop}
        onClose={noop}
      />,
    );
    expect(screen.getByRole("button", { name: /Confirm/i })).toBeDisabled();
    expect(screen.getByText(/No bills have been entered/i)).toBeInTheDocument();
  });

  it("enables Confirm button when bills exist", () => {
    render(
      <MonthSnapshot
        month="2026-04"
        bills={[makeBill()]}
        income={[]}
        savingsLog={[]}
        checkLog={[]}
        onSave={noop}
        onClose={noop}
      />,
    );
    expect(screen.getByRole("button", { name: /Confirm/i })).not.toBeDisabled();
    expect(screen.queryByText(/No bills have been entered/i)).not.toBeInTheDocument();
  });
});

describe("MonthSnapshot — income edge cases", () => {
  it("shows zero income when no income entry exists for the month", () => {
    render(
      <MonthSnapshot
        month="2026-05"  // no income for May
        bills={[makeBill({ month: "2026-05" })]}
        income={[makeIncome({ month: "2026-04" })]} // different month
        savingsLog={[]}
        checkLog={[]}
        onSave={noop}
        onClose={noop}
      />,
    );
    // With zero income and any bills, we get a shortfall
    expect(screen.getByText("Short")).toBeInTheDocument();
  });

  it("filters savings by month prefix (e.weekOf fallback)", () => {
    const onSave = jest.fn();
    // Entry uses weekOf (not date) — should still match
    const savingsLog: SavingsEntry[] = [
      { id: "s1", weekOf: "2026-04-06", amount: 4000 } as SavingsEntry,
    ];
    render(
      <MonthSnapshot
        month="2026-04"
        bills={[makeBill()]}
        income={[]}
        savingsLog={savingsLog}
        checkLog={[]}
        onSave={onSave}
        onClose={noop}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Confirm/i }));
    expect(onSave.mock.calls[0][0].savingsMoved).toBe(4000);
  });

  it("handles savings entry with neither date nor weekOf — falls back to empty string (line 53)", () => {
    const onSave = jest.fn();
    // Entry has neither date nor weekOf — dateStr = "" → doesn't match "2026-04" prefix
    const savingsLog = [{ id: "s1", amount: 3000 } as SavingsEntry];
    render(
      <MonthSnapshot
        month="2026-04"
        bills={[makeBill()]}
        income={[]}
        savingsLog={savingsLog}
        checkLog={[]}
        onSave={onSave}
        onClose={noop}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Confirm/i }));
    expect(onSave.mock.calls[0][0].savingsMoved).toBe(0);
  });
});
