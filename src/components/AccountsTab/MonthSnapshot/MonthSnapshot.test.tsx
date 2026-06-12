import { render, screen, fireEvent, within } from "@testing-library/react";
import { MonthSnapshot } from "./MonthSnapshot";
import type {
  Bill,
  InstallmentPlan,
  KiasCheckEntry,
  MonthlyIncome,
  MonthSnapshot as MonthSnapshotType,
  PaycheckWeek,
  SavingsEntry,
} from "@/types";

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

function makePlan(overrides: Partial<InstallmentPlan> = {}): InstallmentPlan {
  return {
    id: "plan-1",
    label: "Affirm Couch",
    mc: 5000,
    start: "2026-04",
    end: "2026-06",
    dueDay: 12,
    ...overrides,
  };
}

function makeWeek(overrides: Partial<PaycheckWeek> = {}): PaycheckWeek {
  return {
    weekOf: "2026-04-06",
    kiasPay: 76423,
    storage: 0,
    rent: 0,
    jazmin: 0,
    dre: 0,
    savings: 0,
    paypalCC: 0,
    deductions: 0,
    extra: {},
    ...overrides,
  };
}

const noop = () => {};

function renderSnapshot(overrides: {
  month?: string;
  bills?: Bill[];
  income?: MonthlyIncome[];
  savingsLog?: SavingsEntry[];
  checkLog?: KiasCheckEntry[];
  plans?: InstallmentPlan[];
  paycheck?: PaycheckWeek[];
  onSave?: (snapshot: MonthSnapshotType) => void;
  onClose?: () => void;
} = {}) {
  return render(
    <MonthSnapshot
      month={overrides.month ?? "2026-04"}
      bills={overrides.bills ?? []}
      income={overrides.income ?? []}
      savingsLog={overrides.savingsLog ?? []}
      checkLog={overrides.checkLog ?? []}
      plans={overrides.plans ?? []}
      paycheck={overrides.paycheck ?? []}
      onSave={overrides.onSave ?? noop}
      onClose={overrides.onClose ?? noop}
    />,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("MonthSnapshot — rendering", () => {
  it("renders the month label", () => {
    renderSnapshot();
    expect(screen.getByText(/April 2026/)).toBeInTheDocument();
  });

  it("renders Total Billed stat", () => {
    const bills = [makeBill({ cents: 10800 }), makeBill({ id: "b2", cents: 5000 })];
    renderSnapshot({ bills });
    expect(screen.getByText("Total Billed")).toBeInTheDocument();
    // With zero income, shortfall = totalBilled, so "$158.00" appears in both
    // the "Total Billed" stat and the "Short" stat. Scope to the label's container.
    const totalBilledLabel = screen.getByText("Total Billed");
    expect(within(totalBilledLabel.closest("div")!).getByText("$158.00")).toBeInTheDocument();
  });

  it("renders shortfall label when billed exceeds income", () => {
    const bills = [makeBill({ cents: 300000 })]; // $3,000
    const income = [makeIncome({ military_pay: 200000, retirement: 0, social_security: 0, kias_pay: 0 })];
    renderSnapshot({ bills, income });
    expect(screen.getByText("Gap")).toBeInTheDocument();
  });

  it("renders surplus label when income exceeds billed", () => {
    const bills = [makeBill({ cents: 10000 })]; // $100
    const income = [makeIncome({ military_pay: 500000, retirement: 0, social_security: 0, kias_pay: 0 })];
    renderSnapshot({ bills, income });
    expect(screen.getByText("Surplus")).toBeInTheDocument();
  });

  it("renders Cancel and Confirm buttons", () => {
    renderSnapshot();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Confirm/i })).toBeInTheDocument();
  });
});

describe("MonthSnapshot — actions", () => {
  it("calls onClose when Cancel is clicked", () => {
    const onClose = jest.fn();
    renderSnapshot({ onClose });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onSave and onClose when Confirm is clicked", () => {
    const onSave = jest.fn();
    const onClose = jest.fn();
    const bills = [makeBill({ cents: 10800, paid: true })];
    renderSnapshot({ bills, onSave, onClose });
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

    renderSnapshot({ bills, income, savingsLog, checkLog, onSave });
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
    renderSnapshot();
    expect(screen.getByRole("button", { name: /Confirm/i })).toBeDisabled();
    expect(screen.getByText(/No bills have been entered/i)).toBeInTheDocument();
  });

  it("enables Confirm button when bills exist", () => {
    renderSnapshot({ bills: [makeBill()] });
    expect(screen.getByRole("button", { name: /Confirm/i })).not.toBeDisabled();
    expect(screen.queryByText(/No bills have been entered/i)).not.toBeInTheDocument();
  });
});

describe("MonthSnapshot — income edge cases", () => {
  it("shows shortfall when month-income record zeroes out fixed income", () => {
    renderSnapshot({
      month: "2026-05",
      bills: [makeBill({ month: "2026-05", cents: 300000 })],
      income: [
        makeIncome({
          month: "2026-05",
          kias_pay: 0,
          military_pay: 0,
          retirement: 0,
          social_security: 0,
        }),
      ],
    });
    expect(screen.getByText("Gap")).toBeInTheDocument();
  });

  it("filters savings by month prefix (e.weekOf fallback)", () => {
    const onSave = jest.fn();
    // Entry uses weekOf (not date) — should still match
    const savingsLog: SavingsEntry[] = [
      { id: "s1", weekOf: "2026-04-06", amount: 4000 } as SavingsEntry,
    ];
    renderSnapshot({ bills: [makeBill()], savingsLog, onSave });
    fireEvent.click(screen.getByRole("button", { name: /Confirm/i }));
    expect(onSave.mock.calls[0][0].savingsMoved).toBe(4000);
  });

  it("handles savings entry with neither date nor weekOf — falls back to empty string (line 53)", () => {
    const onSave = jest.fn();
    // Entry has neither date nor weekOf — dateStr = "" → doesn't match "2026-04" prefix
    const savingsLog = [{ id: "s1", amount: 3000 } as SavingsEntry];
    renderSnapshot({ bills: [makeBill()], savingsLog, onSave });
    fireEvent.click(screen.getByRole("button", { name: /Confirm/i }));
    expect(onSave.mock.calls[0][0].savingsMoved).toBe(0);
  });

  it("counts plan-derived burden and paycheck actuals in the saved snapshot", () => {
    const onSave = jest.fn();
    renderSnapshot({
      bills: [makeBill({ cents: 10000, paid: true })],
      plans: [makePlan({ mc: 5000 })],
      paycheck: [makeWeek({ weekOf: "2026-04-06", kiasPay: 76423 })],
      onSave,
    });

    fireEvent.click(screen.getByRole("button", { name: /Confirm/i }));

    expect(onSave.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        totalBilled: 15000,
        totalPaid: 10000,
        kiasPayActual: 76423,
      }),
    );
  });
});
