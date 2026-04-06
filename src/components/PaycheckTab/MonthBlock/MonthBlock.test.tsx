import { render, screen, fireEvent } from "@testing-library/react";
import { MonthBlock } from "./MonthBlock";
import type { KiasCheckEntry, PaycheckColumn, PaycheckWeek } from "@/types";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("@/lib/dates", () => ({
  ...jest.requireActual("@/lib/dates"),
  fmtMonthFull: jest.fn((m: string) => {
    const map: Record<string, string> = { "2026-04": "April 2026" };
    return map[m] ?? m;
  }),
  mondayOf: jest.fn((d: string) => d), // identity — test dates are already Mondays
}));

// ─── Factories ────────────────────────────────────────────────────────────────

function makeWeek(overrides: Partial<PaycheckWeek> = {}): PaycheckWeek {
  return {
    weekOf: "2026-04-06",
    kiasPay: 76423,
    storage: 15000,
    rent: 0,
    jazmin: 0,
    dre: 0,
    savings: 0,
    paypalCC: 0,
    deductions: 0,
    ...overrides,
  };
}

const COLUMNS: PaycheckColumn[] = [
  { key: "storage", label: "Storage", fixed: true },
];

const noop = () => {};

function renderBlock(overrides: {
  month?: string;
  mondays?: string[];
  columns?: PaycheckColumn[];
  paycheck?: PaycheckWeek[];
  checkLog?: KiasCheckEntry[];
  savingsByWeek?: Map<string, number>;
  affirmPerWeek?: number;
  affirmMonthTotal?: number;
  isCollapsed?: boolean;
  onToggle?: () => void;
  onUpsertWeek?: (w: PaycheckWeek) => void;
  template?: PaycheckWeek;
} = {}) {
  return render(
    // MonthBlock renders <tr> fragments — must live inside a valid table
    <table>
      <tbody>
        <MonthBlock
          month={overrides.month ?? "2026-04"}
          mondays={overrides.mondays ?? ["2026-04-06"]}
          columns={overrides.columns ?? COLUMNS}
          paycheck={overrides.paycheck ?? [makeWeek()]}
          checkLog={overrides.checkLog ?? []}
          savingsByWeek={overrides.savingsByWeek ?? new Map()}
          affirmPerWeek={overrides.affirmPerWeek ?? 0}
          affirmMonthTotal={overrides.affirmMonthTotal ?? 0}
          isCollapsed={overrides.isCollapsed ?? false}
          onToggle={overrides.onToggle ?? noop}
          onUpsertWeek={overrides.onUpsertWeek ?? noop}
          onAddCheckEntry={noop}
          onDeleteCheckEntry={noop}
          template={overrides.template}
        />
      </tbody>
    </table>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("MonthBlock — rendering", () => {
  it("renders the month label", () => {
    renderBlock();
    expect(screen.getByText("April 2026")).toBeInTheDocument();
  });

  it("shows collapse icon ► when collapsed", () => {
    renderBlock({ isCollapsed: true });
    expect(screen.getByText("►")).toBeInTheDocument();
  });

  it("shows collapse icon ▼ when expanded", () => {
    renderBlock({ isCollapsed: false });
    expect(screen.getByText("▼")).toBeInTheDocument();
  });

  it("renders week rows when expanded", () => {
    renderBlock({ isCollapsed: false, mondays: ["2026-04-06"] });
    // WeekRow renders the date as "4/6" in en-US locale
    expect(screen.getByText("4/6")).toBeInTheDocument();
  });

  it("does not render week rows when collapsed", () => {
    renderBlock({ isCollapsed: true, mondays: ["2026-04-06"] });
    expect(screen.queryByText("4/6")).not.toBeInTheDocument();
  });

  it("renders the monthly Total row when expanded", () => {
    renderBlock({ isCollapsed: false });
    expect(screen.getByText("Total")).toBeInTheDocument();
  });

  it("does not render Total row when collapsed", () => {
    renderBlock({ isCollapsed: true });
    expect(screen.queryByText("Total")).not.toBeInTheDocument();
  });
});

describe("MonthBlock — interactions", () => {
  it("calls onToggle when the month header row is clicked", () => {
    const onToggle = jest.fn();
    renderBlock({ onToggle });
    fireEvent.click(screen.getByText("April 2026"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

describe("MonthBlock — mondays emptyWeek fallback", () => {
  it("falls back to emptyWeek when no matching paycheck entry exists for a monday (line 64 ?? branch)", () => {
    // checkLog is empty → takes the mondays.map branch (line 60-67).
    // paycheck is also empty → paycheck.find returns undefined → emptyWeek is called.
    renderBlock({
      isCollapsed: false,
      checkLog: [],
      paycheck: [],
      mondays: ["2026-04-06"],
    });
    // emptyWeek produces a zero-value week; WeekRow still renders the date
    expect(screen.getByText("4/6")).toBeInTheDocument();
  });
});

describe("MonthBlock — checkLog branch", () => {
  it("builds rows from checkLog entries when checkLog is non-empty", () => {
    const checkLog: KiasCheckEntry[] = [
      { weekOf: "2026-04-08", amount: 76423 },
    ];
    renderBlock({
      isCollapsed: false,
      checkLog,
      // No matching paycheck — should fall back to emptyWeek
      paycheck: [],
    });
    // WeekRow should render for the checkLog entry's date
    expect(screen.getByText("4/8")).toBeInTheDocument();
  });

  it("sorts multiple checkLog entries by weekOf (line 49 sort comparator)", () => {
    // Two entries out of order — sort must invoke the comparator to order them
    const checkLog: KiasCheckEntry[] = [
      { weekOf: "2026-04-13", amount: 50000 },
      { weekOf: "2026-04-06", amount: 76423 },
    ];
    renderBlock({ isCollapsed: false, checkLog, paycheck: [] });
    const rows = screen.getAllByRole("row");
    // First data row after header should be Apr 6 (earlier date sorts first)
    expect(rows[1]).toHaveTextContent("4/6");
  });

  it("uses existing paycheck entry when checkLog row has a matching week (paycheck.find true branch)", () => {
    const checkLog: KiasCheckEntry[] = [{ weekOf: "2026-04-06", amount: 90000 }];
    const paycheckEntry = makeWeek({ weekOf: "2026-04-06", kiasPay: 90000 });
    renderBlock({
      isCollapsed: false,
      checkLog,
      paycheck: [paycheckEntry], // non-empty — exercises (p) => p.weekOf === monday callback
    });
    // Row renders for the check entry date
    expect(screen.getByText("4/6")).toBeInTheDocument();
  });

  it("invokes checkLog.find callback when mondays.map runs with non-empty checkLog (line 62 fn branch)", () => {
    // checkLog has an entry for a DIFFERENT month → monthCheckEntries is empty → mondays.map path
    // checkLog.find callback IS invoked for each monday to look for a matching amount
    const checkLog: KiasCheckEntry[] = [{ weekOf: "2026-05-05", amount: 55000 }];
    renderBlock({
      isCollapsed: false,
      month: "2026-04",
      mondays: ["2026-04-06"],
      checkLog,
      paycheck: [],
    });
    // The May entry doesn't match April mondays → emptyWeek used; row still renders
    expect(screen.getByText("4/6")).toBeInTheDocument();
  });

  it("applies negative style when monthRemaining is below zero (line 131 branch)", () => {
    // kiasPay=0, affirmMonthTotal=10000 → monthRemaining = -10000 → negative class
    const { container } = renderBlock({
      isCollapsed: false,
      paycheck: [makeWeek({ kiasPay: 0 })],
      affirmMonthTotal: 10000,
    });
    // CSS Modules mock maps styles.negative → "negative"
    expect(container.querySelector(".negative")).toBeInTheDocument();
  });
});
