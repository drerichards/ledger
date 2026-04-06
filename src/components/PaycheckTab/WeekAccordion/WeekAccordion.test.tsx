import { render, screen, fireEvent } from "@testing-library/react";
import { WeekAccordion } from "./WeekAccordion";
import type { KiasCheckEntry, PaycheckColumn, PaycheckWeek } from "@/types";
import { calcCheckBaseline } from "@/lib/projection";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("@/lib/dates", () => ({
  ...jest.requireActual("@/lib/dates"),
  currentMonth: jest.fn(() => "2026-04"),
}));

jest.mock("@/lib/projection", () => ({
  calcCheckBaseline: jest.fn(() => ({
    average: 76423,
    low: 70000,
    high: 85000,
    weeks: 4,
  })),
}));

// ─── Factories ────────────────────────────────────────────────────────────────

const CURRENT_WEEK = "2026-04-07"; // April — current month
const HISTORICAL_WEEK = "2026-03-03"; // March — past month

function makeWeek(overrides: Partial<PaycheckWeek> = {}): PaycheckWeek {
  return {
    weekOf: CURRENT_WEEK,
    kiasPay: 76423,
    storage: 15000,
    rent: 100000,
    jazmin: 10000,
    dre: 10000,
    savings: 0,
    paypalCC: 5000,
    deductions: 0,
    ...overrides,
  };
}

const COLUMNS: PaycheckColumn[] = [
  { key: "storage", label: "Storage", fixed: true },
  { key: "rent", label: "Rent", fixed: true },
];

const noop = () => {};

function renderAccordion(overrides: Partial<Parameters<typeof WeekAccordion>[0]> = {}) {
  const defaults = {
    week: makeWeek(),
    columns: COLUMNS,
    displayDate: CURRENT_WEEK,
    affirmPerWeek: 9413,
    savingsForWeek: 0,
    isExpanded: false,
    onToggle: noop,
    onUpsertWeek: noop,
    onAddCheckEntry: noop,
    onUpdateCheckEntry: noop,
    onDeleteCheckEntry: noop,
    checkLog: [],
    checkEditWarningAcked: false,
    onAckCheckEditWarning: noop,
  };
  return render(<WeekAccordion {...defaults} {...overrides} />);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("WeekAccordion — rendering", () => {
  it("shows ▸ chevron when collapsed", () => {
    renderAccordion({ isExpanded: false });
    expect(screen.getByText("▸")).toBeInTheDocument();
  });

  it("shows ▾ chevron when expanded", () => {
    renderAccordion({ isExpanded: true });
    expect(screen.getByText("▾")).toBeInTheDocument();
  });

  it("renders the week label", () => {
    renderAccordion({ displayDate: "2026-04-07" });
    expect(screen.getByText(/Week of/)).toBeInTheDocument();
  });

  it("renders Affirm derived value", () => {
    renderAccordion({ affirmPerWeek: 9413 });
    expect(screen.getByText("$94.13")).toBeInTheDocument();
  });

  it("renders savings dash when savingsForWeek is 0", () => {
    renderAccordion({ isExpanded: true, savingsForWeek: 0 });
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders savings amount when savingsForWeek is positive", () => {
    renderAccordion({ isExpanded: true, savingsForWeek: 5000 });
    expect(screen.getByText("$50.00")).toBeInTheDocument();
  });

  it("renders onGoToAffirm as a button when provided", () => {
    renderAccordion({ isExpanded: true, onGoToAffirm: noop });
    expect(screen.getByRole("button", { name: /Affirm/i })).toBeInTheDocument();
  });

  it("renders Affirm as plain text when onGoToAffirm is not provided", () => {
    renderAccordion({ isExpanded: true, onGoToAffirm: undefined });
    // No Affirm button in expanded body — text label exists
    const labels = screen.getAllByText("Affirm");
    expect(labels.length).toBeGreaterThan(0);
  });

  it("renders onGoToSavings as a button when provided", () => {
    renderAccordion({ isExpanded: true, onGoToSavings: noop });
    expect(screen.getByRole("button", { name: /Savings/i })).toBeInTheDocument();
  });
});

describe("WeekAccordion — toggle", () => {
  it("calls onToggle when header is clicked", () => {
    const onToggle = jest.fn();
    renderAccordion({ onToggle });
    fireEvent.click(screen.getByRole("button", { name: /Week of/ }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("calls onToggle on Enter keydown", () => {
    const onToggle = jest.fn();
    renderAccordion({ onToggle });
    fireEvent.keyDown(screen.getByRole("button", { name: /Week of/ }), { key: "Enter" });
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("calls onToggle on Space keydown", () => {
    const onToggle = jest.fn();
    renderAccordion({ onToggle });
    fireEvent.keyDown(screen.getByRole("button", { name: /Week of/ }), { key: " " });
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("does not call onToggle on other keys", () => {
    const onToggle = jest.fn();
    renderAccordion({ onToggle });
    fireEvent.keyDown(screen.getByRole("button", { name: /Week of/ }), { key: "Tab" });
    expect(onToggle).not.toHaveBeenCalled();
  });
});

describe("WeekAccordion — kiasPay edit (current month)", () => {
  it("calls onUpsertWeek + onDeleteCheckEntry + onAddCheckEntry for current month", () => {
    const onUpsertWeek = jest.fn();
    const onAddCheckEntry = jest.fn();
    const onDeleteCheckEntry = jest.fn();
    renderAccordion({
      week: makeWeek({ weekOf: CURRENT_WEEK, kiasPay: 0 }),
      onUpsertWeek,
      onAddCheckEntry,
      onDeleteCheckEntry,
    });

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // buttons[0] = header toggle; buttons[1] = Kia's Pay AmountInput
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "764.23" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onUpsertWeek).toHaveBeenCalledWith(
      expect.objectContaining({ kiasPay: 76423 }),
    );
    expect(onDeleteCheckEntry).toHaveBeenCalledWith(CURRENT_WEEK);
    expect(onAddCheckEntry).toHaveBeenCalledWith({ weekOf: CURRENT_WEEK, amount: 76423 });
  });

  it("does not call onAddCheckEntry when kiasPay is set to 0", () => {
    const onAddCheckEntry = jest.fn();
    renderAccordion({
      week: makeWeek({ weekOf: CURRENT_WEEK }),
      onAddCheckEntry,
    });

    fireEvent.click(screen.getAllByRole("button")[1]); // buttons[1] = Kia's Pay AmountInput
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onAddCheckEntry).not.toHaveBeenCalled();
  });
});

describe("WeekAccordion — historical check edit modal", () => {
  function setupHistorical(overrides: { checkEntry?: KiasCheckEntry; checkEditWarningAcked?: boolean } = {}) {
    const onUpsertWeek = jest.fn();
    const onUpdateCheckEntry = jest.fn();
    const onAddCheckEntry = jest.fn();
    const onAckCheckEditWarning = jest.fn();

    renderAccordion({
      week: makeWeek({ weekOf: HISTORICAL_WEEK, kiasPay: 70000 }),
      displayDate: HISTORICAL_WEEK,
      checkEditWarningAcked: overrides.checkEditWarningAcked ?? false,
      checkEntry: overrides.checkEntry,
      checkLog: [{ weekOf: HISTORICAL_WEEK, amount: 70000 }],
      onUpsertWeek,
      onUpdateCheckEntry,
      onAddCheckEntry,
      onAckCheckEditWarning,
    });

    // Enter edit mode on Kia's Pay — buttons[0] is the header toggle, buttons[1] is the AmountInput
    fireEvent.click(screen.getAllByRole("button")[1]);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "800.00" } });
    fireEvent.keyDown(input, { key: "Enter" });

    return { onUpsertWeek, onUpdateCheckEntry, onAddCheckEntry, onAckCheckEditWarning };
  }

  it("shows confirmation modal when editing a historical check", () => {
    setupHistorical();
    expect(screen.getByText("Edit Historical Check Amount")).toBeInTheDocument();
  });

  it("shows warning text when checkEditWarningAcked is false", () => {
    setupHistorical();
    expect(screen.getByText(/changing a check amount from a past month/)).toBeInTheDocument();
  });

  it("calls cancelEdit when Cancel is clicked in the modal", () => {
    setupHistorical();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("Edit Historical Check Amount")).not.toBeInTheDocument();
  });

  it("calls onUpdateCheckEntry when confirming with an existing checkEntry", () => {
    const checkEntry: KiasCheckEntry = { weekOf: HISTORICAL_WEEK, amount: 70000 };
    const { onUpdateCheckEntry } = setupHistorical({ checkEntry });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onUpdateCheckEntry).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 80000 }),
    );
  });

  it("calls onAddCheckEntry when confirming without an existing checkEntry", () => {
    const { onAddCheckEntry } = setupHistorical({ checkEntry: undefined });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onAddCheckEntry).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 80000 }),
    );
  });

  it("calls onAckCheckEditWarning when dontShowAgain is checked and confirmed", () => {
    const { onAckCheckEditWarning } = setupHistorical();
    fireEvent.click(screen.getByLabelText(/Don't show this warning again/));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onAckCheckEditWarning).toHaveBeenCalledTimes(1);
  });

  it("does not call onAckCheckEditWarning when dontShowAgain is not checked", () => {
    const { onAckCheckEditWarning } = setupHistorical();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onAckCheckEditWarning).not.toHaveBeenCalled();
  });

  it("skips modal when checkEditWarningAcked is true", () => {
    const onUpsertWeek = jest.fn();
    renderAccordion({
      week: makeWeek({ weekOf: HISTORICAL_WEEK, kiasPay: 70000 }),
      displayDate: HISTORICAL_WEEK,
      checkEditWarningAcked: true,
      checkLog: [],
      onUpsertWeek,
    });

    fireEvent.click(screen.getAllByRole("button")[1]); // buttons[1] = Kia's Pay AmountInput
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "800.00" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.queryByText("Edit Historical Check Amount")).not.toBeInTheDocument();
    expect(onUpsertWeek).toHaveBeenCalledWith(
      expect.objectContaining({ kiasPay: 80000 }),
    );
  });

  it("skips modal when the new amount equals the old amount", () => {
    const onUpsertWeek = jest.fn();
    renderAccordion({
      week: makeWeek({ weekOf: HISTORICAL_WEEK, kiasPay: 70000 }),
      displayDate: HISTORICAL_WEEK,
      checkEditWarningAcked: false,
      checkEntry: { weekOf: HISTORICAL_WEEK, amount: 70000 },
      checkLog: [{ weekOf: HISTORICAL_WEEK, amount: 70000 }],
      onUpsertWeek,
    });

    fireEvent.click(screen.getAllByRole("button")[1]); // buttons[1] = Kia's Pay AmountInput
    const input = screen.getByRole("textbox");
    // Same amount as current (700.00)
    fireEvent.change(input, { target: { value: "700.00" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.queryByText("Edit Historical Check Amount")).not.toBeInTheDocument();
    expect(onUpsertWeek).toHaveBeenCalled();
  });
});

describe("WeekAccordion — column editing", () => {
  it("calls onUpsertWeek when a column value is changed", () => {
    const onUpsertWeek = jest.fn();
    renderAccordion({ isExpanded: true, onUpsertWeek });

    const buttons = screen.getAllByRole("button");
    // buttons[0] = header toggle, buttons[1] = Kia's Pay, buttons[2] = Storage (first column)
    fireEvent.click(buttons[2]);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "150.00" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onUpsertWeek).toHaveBeenCalledWith(
      expect.objectContaining({ storage: 15000 }),
    );
  });
});

describe("WeekAccordion — readOnly", () => {
  it("renders with readOnly prop without throwing", () => {
    renderAccordion({ readOnly: true });
    expect(screen.getByText(/Week of/)).toBeInTheDocument();
  });
});

describe("WeekAccordion — remaining styles", () => {
  it("applies positive class when remaining > 0 (line 250 truthy branch)", () => {
    // kiasPay: 76423, columns only storage+rent at tiny values, affirmPerWeek=0, savings=0
    // totalAllocated = 1 + 1 = 2 → remaining = 76423 - 2 = 76421 (positive)
    const { container } = renderAccordion({
      week: makeWeek({ kiasPay: 76423, storage: 1, rent: 1 }),
      affirmPerWeek: 0,
      savingsForWeek: 0,
    });
    expect(container.querySelector(".positive")).toBeInTheDocument();
  });
});

describe("WeekAccordion — baselineImpact display", () => {
  // NOTE: line 145 `if (!pendingEdit) return` in confirmEdit is a defensive guard —
  // the Confirm button only renders inside `{showConfirmModal && pendingEdit && (...)}`,
  // so pendingEdit is always set when confirmEdit is callable via UI.

  it("renders baselineImpact section and updated average text when averages differ (lines 91-98, 443)", () => {
    // First call = currentBaseline, second call = newBaseline with different average
    (calcCheckBaseline as jest.Mock)
      .mockReturnValueOnce({ average: 76423, low: 70000, high: 85000, weeks: 4 })
      .mockReturnValueOnce({ average: 80000, low: 72000, high: 88000, weeks: 4 });

    const checkEntry: KiasCheckEntry = { weekOf: HISTORICAL_WEEK, amount: 70000 };
    renderAccordion({
      week: makeWeek({ weekOf: HISTORICAL_WEEK, kiasPay: 70000 }),
      displayDate: HISTORICAL_WEEK,
      checkEditWarningAcked: false,
      checkEntry,
      checkLog: [{ weekOf: HISTORICAL_WEEK, amount: 70000 }],
    });

    // Trigger historical edit to set pendingEdit → useMemo computes baselineImpact
    fireEvent.click(screen.getAllByRole("button")[1]);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "800.00" } });
    fireEvent.keyDown(input, { key: "Enter" });

    // baselineImpact renders with "What else changes:" section
    expect(screen.getByText("What else changes:")).toBeInTheDocument();
    // line 443 branch: averages differ → the forecast sentence renders
    expect(screen.getByText(/This change will update your 12-month savings forecast/)).toBeInTheDocument();
  });

  it("does NOT render forecast sentence when averages are equal (line 443 falsy branch)", () => {
    // Both calls return same value (default mock) → averages equal → sentence not rendered
    const checkEntry: KiasCheckEntry = { weekOf: HISTORICAL_WEEK, amount: 70000 };
    renderAccordion({
      week: makeWeek({ weekOf: HISTORICAL_WEEK, kiasPay: 70000 }),
      displayDate: HISTORICAL_WEEK,
      checkEditWarningAcked: false,
      checkEntry,
      checkLog: [{ weekOf: HISTORICAL_WEEK, amount: 70000 }],
    });

    fireEvent.click(screen.getAllByRole("button")[1]);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "800.00" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.queryByText(/This change will update your 12-month savings forecast/)).not.toBeInTheDocument();
  });
});
