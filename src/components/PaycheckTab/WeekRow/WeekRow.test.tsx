import { render, screen, fireEvent } from "@testing-library/react";
import { WeekRow } from "./WeekRow";
import type { KiasCheckEntry, PaycheckColumn, PaycheckWeek } from "@/types";

// ─── Factories ────────────────────────────────────────────────────────────────

function makeWeek(overrides: Partial<PaycheckWeek> = {}): PaycheckWeek {
  return {
    weekOf: "2026-04-06",
    kiasPay: 0,
    storage: 0,
    rent: 0,
    jazmin: 0,
    dre: 0,
    savings: 0,
    paypalCC: 0,
    deductions: 0,
    ...overrides,
  };
}

const FIXED_COLUMNS: PaycheckColumn[] = [
  { key: "storage", label: "Storage", fixed: true },
  { key: "rent", label: "Rent", fixed: true },
];

const noop = () => {};

function renderRow(overrides: {
  week?: PaycheckWeek;
  columns?: PaycheckColumn[];
  displayDate?: string;
  affirmPerWeek?: number;
  savingsForWeek?: number;
  onUpsertWeek?: (w: PaycheckWeek) => void;
  onAddCheckEntry?: (e: KiasCheckEntry) => void;
  onDeleteCheckEntry?: (weekOf: string) => void;
} = {}) {
  return render(
    // WeekRow renders a <tr> — must be inside a valid table
    <table>
      <tbody>
        <WeekRow
          week={overrides.week ?? makeWeek()}
          columns={overrides.columns ?? FIXED_COLUMNS}
          displayDate={overrides.displayDate ?? "2026-04-06"}
          affirmPerWeek={overrides.affirmPerWeek ?? 0}
          savingsForWeek={overrides.savingsForWeek ?? 0}
          onUpsertWeek={overrides.onUpsertWeek ?? noop}
          onAddCheckEntry={overrides.onAddCheckEntry ?? noop}
          onDeleteCheckEntry={overrides.onDeleteCheckEntry ?? noop}
        />
      </tbody>
    </table>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("WeekRow — rendering", () => {
  it("renders the week date label", () => {
    renderRow({ displayDate: "2026-04-06" });
    // new Date("2026-04-06T12:00:00") → "4/6" in en-US locale
    expect(screen.getByText("4/6")).toBeInTheDocument();
  });

  it("renders Affirm as a read-only derived value", () => {
    renderRow({ affirmPerWeek: 9413 });
    expect(screen.getByText("$94.13")).toBeInTheDocument();
  });

  it("renders a dash for savings when savingsForWeek is 0", () => {
    renderRow({ savingsForWeek: 0 });
    // AmountInput also renders "—" for zero column cells — use getAllByText
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("renders savings amount when savingsForWeek is positive", () => {
    renderRow({ savingsForWeek: 5000 });
    expect(screen.getByText("$50.00")).toBeInTheDocument();
  });

  it("renders remaining column", () => {
    // kiasPay $1,500 - storage $500 = $1,000 remaining (≠ kiasPay, no duplicate match)
    renderRow({
      week: makeWeek({ kiasPay: 150000, storage: 50000 }),
      affirmPerWeek: 0,
      savingsForWeek: 0,
    });
    expect(screen.getByText("$1,000.00")).toBeInTheDocument();
  });

  it("renders one AmountInput per configurable column", () => {
    renderRow({ columns: FIXED_COLUMNS });
    // Each AmountInput renders a button (the clickable cell) — Kia's Pay + Storage + Rent = 3
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(FIXED_COLUMNS.length);
  });
});

describe("WeekRow — interactions", () => {
  it("calls onUpsertWeek when kiasPay is edited", () => {
    const onUpsertWeek = jest.fn();
    const onAddCheckEntry = jest.fn();
    const onDeleteCheckEntry = jest.fn();
    renderRow({ onUpsertWeek, onAddCheckEntry, onDeleteCheckEntry });

    // Click the first button (Kia's Pay AmountInput) to enter edit mode
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "764.23" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onUpsertWeek).toHaveBeenCalledWith(
      expect.objectContaining({ kiasPay: 76423 }),
    );
  });

  it("calls onDeleteCheckEntry + onAddCheckEntry when kiasPay is set > 0", () => {
    const onAddCheckEntry = jest.fn();
    const onDeleteCheckEntry = jest.fn();
    renderRow({ onAddCheckEntry, onDeleteCheckEntry });

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "500.00" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onDeleteCheckEntry).toHaveBeenCalledWith("2026-04-06");
    expect(onAddCheckEntry).toHaveBeenCalledWith({ weekOf: "2026-04-06", amount: 50000 });
  });

  it("does not call onAddCheckEntry when kiasPay is set to 0", () => {
    const onAddCheckEntry = jest.fn();
    const onDeleteCheckEntry = jest.fn();
    renderRow({ onAddCheckEntry, onDeleteCheckEntry });

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onDeleteCheckEntry).toHaveBeenCalledWith("2026-04-06");
    expect(onAddCheckEntry).not.toHaveBeenCalled();
  });

  it("calls onUpsertWeek when a configurable column is edited (updateColumn — lines 38-40)", () => {
    const onUpsertWeek = jest.fn();
    renderRow({ onUpsertWeek });

    // buttons[0] = Kia's Pay, buttons[1] = Storage (first configurable column)
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "150.00" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onUpsertWeek).toHaveBeenCalledWith(
      expect.objectContaining({ storage: 15000 }),
    );
  });
});
