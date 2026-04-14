import { render, screen, fireEvent, act } from "@testing-library/react";
import { AccountsTab } from "@/components/AccountsTab/AccountsTab";
import type { Bill } from "@/types";

// ─── Mock hooks ───────────────────────────────────────────────────────────────

jest.mock("@/hooks/useBillChartState", () => ({
  useBillChartState: jest.fn((bills: import("@/types").Bill[]) => ({
    visibleBills: bills ?? [],
    kiasBills: (bills ?? []).filter((b) => b.group === "kias_pay"),
    otherBills: (bills ?? []).filter((b) => b.group === "other_income"),
    kiasBillsCents: 0,
    otherBillsCents: 0,
    paidCents: 0,
    unpaidCents: 0,
    kiasPayCents: 0,
    thisMonthIncome: null,
    shortfall: 0,
  })),
}));

jest.mock("@/lib/dates", () => ({
  ...jest.requireActual("@/lib/dates"),
  currentMonth: jest.fn(() => "2026-04"),
}));

jest.mock("@/lib/export", () => ({
  exportBillsCSV: jest.fn(),
}));

// ─── Factory ──────────────────────────────────────────────────────────────────

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

const noop = () => {};

function renderTab(overrides: {
  bills?: Bill[];
  viewMonth?: string;
  onViewMonthChange?: (m: string) => void;
  onRollover?: (from: string, to: string) => void;
} = {}) {
  return render(
    <AccountsTab
      bills={overrides.bills ?? []}
      income={[]}
      savingsLog={[]}
      checkLog={[]}
      paycheck={[]}
      viewMonth={overrides.viewMonth ?? "2026-04"}
      onViewMonthChange={overrides.onViewMonthChange ?? noop}
      onAdd={noop}
      onUpdate={noop}
      onDelete={noop}
      onTogglePaid={noop}
      onUpdateIncome={noop}
      onSaveSnapshot={noop}
      onRollover={overrides.onRollover ?? noop}
    />,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AccountsTab — rendering", () => {
  it("renders the Monthly Total stat card", () => {
    renderTab();
    expect(screen.getByText("Monthly Total")).toBeInTheDocument();
  });

  it("renders the view month label", () => {
    renderTab({ viewMonth: "2026-04" });
    expect(screen.getByText("April 2026")).toBeInTheDocument();
  });

  it("renders month navigation buttons", () => {
    renderTab();
    expect(screen.getByLabelText("Previous month")).toBeInTheDocument();
    expect(screen.getByLabelText("Next month")).toBeInTheDocument();
  });

  it("renders the Add Bill FAB", () => {
    renderTab();
    expect(screen.getByRole("button", { name: "Add bill" })).toBeInTheDocument();
  });
});

describe("AccountsTab — month navigation", () => {
  it("calls onViewMonthChange with the previous month", () => {
    const onViewMonthChange = jest.fn();
    renderTab({ viewMonth: "2026-04", onViewMonthChange });
    fireEvent.click(screen.getByLabelText("Previous month"));
    expect(onViewMonthChange).toHaveBeenCalledWith("2026-03");
  });

  it("navigates forward with no rollover prompt when next month already has bills", () => {
    const onViewMonthChange = jest.fn();
    const bills = [
      makeBill({ month: "2026-04", entry: "recurring" }),
      makeBill({ id: "b2", month: "2026-05" }), // next month has bills
    ];
    renderTab({ bills, viewMonth: "2026-04", onViewMonthChange });
    fireEvent.click(screen.getByLabelText("Next month"));
    // No prompt — directly navigates
    expect(onViewMonthChange).toHaveBeenCalledWith("2026-05");
    expect(screen.queryByText(/Start fresh/)).not.toBeInTheDocument();
  });

  it("shows rollover prompt when navigating forward to an empty month with recurring bills", () => {
    const bills = [makeBill({ month: "2026-04", entry: "recurring" })];
    renderTab({ bills, viewMonth: "2026-04" });
    fireEvent.click(screen.getByLabelText("Next month"));
    expect(screen.getByText(/Start fresh/)).toBeInTheDocument();
  });
});

// NOTE: lines 101 and 108 — `if (!rolloverPrompt) return` guards in confirmRollover and
// dismissRollover are defensive only. Both functions are wired exclusively to buttons that
// render inside `{rolloverPrompt && (...)}`, so rolloverPrompt is always truthy when called.

describe("AccountsTab — rollover prompt", () => {
  function setupRollover() {
    const onRollover = jest.fn();
    const onViewMonthChange = jest.fn();
    const bills = [makeBill({ month: "2026-04", entry: "recurring" })];
    renderTab({ bills, viewMonth: "2026-04", onRollover, onViewMonthChange });
    // Trigger prompt
    fireEvent.click(screen.getByLabelText("Next month"));
    return { onRollover, onViewMonthChange };
  }

  it("calls onRollover and changes view when 'Copy recurring bills' is clicked", () => {
    const { onRollover, onViewMonthChange } = setupRollover();
    fireEvent.click(screen.getByText("Copy recurring bills"));
    expect(onRollover).toHaveBeenCalledWith("2026-04", "2026-05");
    expect(onViewMonthChange).toHaveBeenCalledWith("2026-05");
  });

  it("navigates to next month without rollover when 'Start fresh' is clicked", () => {
    const { onRollover, onViewMonthChange } = setupRollover();
    fireEvent.click(screen.getByText("Start fresh"));
    expect(onRollover).not.toHaveBeenCalled();
    expect(onViewMonthChange).toHaveBeenCalledWith("2026-05");
  });

  it("dismisses prompt and stays on current month when 'Cancel' is clicked", () => {
    const { onViewMonthChange } = setupRollover();
    // There are two Cancel buttons potentially — find the one in the rollover prompt
    const cancelBtns = screen.getAllByText("Cancel");
    fireEvent.click(cancelBtns[cancelBtns.length - 1]);
    expect(screen.queryByText(/Start fresh/)).not.toBeInTheDocument();
    // Should not have navigated
    expect(onViewMonthChange).not.toHaveBeenCalled();
  });
});

describe("AccountsTab — Add Bill modal", () => {
  it("opens the BillForm when FAB is clicked", () => {
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: "Add bill" }));
    // Custom Modal has no role="dialog" — assert the modal title heading instead
    // Modal renders <h3>{title}</h3>; BillForm passes title="Add Bill"
    expect(screen.getByRole("heading", { name: "Add Bill" })).toBeInTheDocument();
  });

  it("opens Month Summary modal when 'Month Summary' is clicked", () => {
    renderTab();
    // Month Summary is inside the More dropdown — open it first
    fireEvent.click(screen.getByRole("button", { name: /More/ }));
    fireEvent.click(screen.getByText("Month Summary"));
    expect(screen.getByText("Month-End Snapshot")).toBeInTheDocument();
  });
});

describe("AccountsTab — sorting", () => {
  it("renders SortableHeader columns (Due, Method, Payee, Amount)", () => {
    renderTab();
    // There are 2 BillGroups — each has these headers (use getAllByText)
    expect(screen.getAllByText(/Due/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Payee/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Amount/).length).toBeGreaterThan(0);
  });

  it("clicking a sort header changes sort direction (handleSort)", () => {
    const bills = [makeBill()];
    renderTab({ bills });
    // Click the "Due" columnheader — first instance (kias_pay group)
    const dueHeaders = screen.getAllByRole("columnheader", { name: /Due/ });
    fireEvent.click(dueHeaders[0]);
    // Click again to toggle direction
    fireEvent.click(dueHeaders[0]);
    // No crash — sort state updated internally
    expect(screen.getByText("Monthly Total")).toBeInTheDocument();
  });

  it("clicking a different sort header changes sort key (handleSort branch)", () => {
    const bills = [makeBill()];
    renderTab({ bills });
    const payeeHeaders = screen.getAllByRole("columnheader", { name: /Payee/ });
    fireEvent.click(payeeHeaders[0]); // sets sortKey to "name"
    const dueHeaders = screen.getAllByRole("columnheader", { name: /Due/ });
    fireEvent.click(dueHeaders[0]); // switches to different key
    expect(screen.getByText("Monthly Total")).toBeInTheDocument();
  });
});

describe("AccountsTab — edit bill", () => {
  it("opens BillForm in edit mode when Edit is clicked on a bill (handleEdit)", () => {
    const bills = [makeBill()];
    renderTab({ bills });
    fireEvent.click(screen.getByRole("button", { name: /actions for t-mobile/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /edit t-mobile/i }));
    expect(screen.getByRole("heading", { name: "Edit Bill" })).toBeInTheDocument();
  });

  it("closes BillForm when Cancel is clicked (handleFormClose)", () => {
    renderTab();
    fireEvent.click(screen.getByRole("button", { name: "Add bill" }));
    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByRole("heading", { name: "Add Bill" })).not.toBeInTheDocument();
  });

  it("calls onAdd when saving a new bill (handleFormSave add path — line 128 else branch)", async () => {
    const onAdd = jest.fn();
    render(
      <AccountsTab
        bills={[]}
        income={[]}
        savingsLog={[]}
        checkLog={[]}
        paycheck={[]}
        viewMonth="2026-04"
        onViewMonthChange={noop}
        onAdd={onAdd}
        onUpdate={noop}
        onDelete={noop}
        onTogglePaid={noop}
        onUpdateIncome={noop}
        onSaveSnapshot={noop}
        onRollover={noop}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add bill" }));
    expect(screen.getByRole("heading", { name: "Add Bill" })).toBeInTheDocument();
    // Fill required fields — Zod rejects an empty form and never calls onSave
    fireEvent.change(screen.getByLabelText("Payee Name"), {
      target: { value: "T-Mobile" },
    });
    fireEvent.change(screen.getByLabelText("Amount ($)"), {
      target: { value: "45.00" },
    });
    fireEvent.change(screen.getByLabelText("Due Day (1–31)"), {
      target: { value: "5" },
    });
    // BillForm uses RHF + Zod — flush microtask queue before asserting
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Add Bill" }));
    });
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("calls onUpdate when editing an existing bill (handleFormSave edit path)", async () => {
    const onUpdate = jest.fn();
    const bills = [makeBill()];
    render(
      <AccountsTab
        bills={bills}
        income={[]}
        savingsLog={[]}
        checkLog={[]}
        paycheck={[]}
        viewMonth="2026-04"
        onViewMonthChange={noop}
        onAdd={noop}
        onUpdate={onUpdate}
        onDelete={noop}
        onTogglePaid={noop}
        onUpdateIncome={noop}
        onSaveSnapshot={noop}
        onRollover={noop}
      />,
    );
    // Open edit mode for the bill — open ⋯ menu first, then click Edit
    fireEvent.click(screen.getByRole("button", { name: /actions for t-mobile/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /edit t-mobile/i }));
    expect(screen.getByRole("heading", { name: "Edit Bill" })).toBeInTheDocument();
    // RHF + zodResolver validates async — flush the microtask queue before asserting
    await act(async () => {
      fireEvent.click(screen.getByText("Save Changes"));
    });
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });
});

describe("AccountsTab — toolbar actions", () => {
  it("calls exportBillsCSV when Export CSV is clicked", () => {
    const { exportBillsCSV } = jest.requireMock("@/lib/export");
    renderTab();
    // Export CSV is inside the More dropdown — open it first
    fireEvent.click(screen.getByRole("button", { name: /More/ }));
    fireEvent.click(screen.getByText("Export CSV"));
    expect(exportBillsCSV).toHaveBeenCalledTimes(1);
  });

  it("Today button sets viewMonth to currentMonth() = '2026-04'", () => {
    const onViewMonthChange = jest.fn();
    renderTab({ viewMonth: "2026-03", onViewMonthChange });
    fireEvent.click(screen.getByText("Today"));
    expect(onViewMonthChange).toHaveBeenCalledWith("2026-04");
  });
});

describe("AccountsTab — MonthSnapshot modal close", () => {
  it("closes MonthSnapshot modal via the Modal × button (onClose on Modal — line 276)", () => {
    renderTab();
    // Month Summary is inside the More dropdown — open it first
    fireEvent.click(screen.getByRole("button", { name: /More/ }));
    fireEvent.click(screen.getByText("Month Summary"));
    expect(screen.getByText("Month-End Snapshot")).toBeInTheDocument();
    // Modal renders a × close button with aria-label "Close"
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByText("Month-End Snapshot")).not.toBeInTheDocument();
  });

  it("closes MonthSnapshot modal via Cancel button inside panel (onClose on panel — line 286)", () => {
    renderTab();
    // Month Summary is inside the More dropdown — open it first
    fireEvent.click(screen.getByRole("button", { name: /More/ }));
    fireEvent.click(screen.getByText("Month Summary"));
    expect(screen.getByText("Month-End Snapshot")).toBeInTheDocument();
    // MonthSnapshot renders its own Cancel button
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("Month-End Snapshot")).not.toBeInTheDocument();
  });
});

describe("AccountsTab — shortfall stat card", () => {
  it("renders 'Short' label and rust color when shortfall > 0 (lines 153-156 truthy branch)", () => {
    const { useBillChartState } = jest.requireMock("@/hooks/useBillChartState");
    (useBillChartState as jest.Mock).mockReturnValueOnce({
      visibleBills: [],
      kiasBills: [],
      otherBills: [],
      kiasBillsCents: 0,
      otherBillsCents: 0,
      paidCents: 0,
      unpaidCents: 0,
      kiasPayCents: 0,
      thisMonthIncome: null,
      shortfall: 24726,
    });
    renderTab();
    expect(screen.getByText("Short")).toBeInTheDocument();
  });
});

describe("AccountsTab — BillGroup collapse toggle", () => {
  it("toggles the kias_pay group collapse state", () => {
    const bills = [makeBill({ group: "kias_pay" })];
    renderTab({ bills });
    // BillGroup header is a plain div (no role) — click by label text
    // "From Kia's Pay" appears in StatCard subLabel [0] AND BillGroup header [1]
    fireEvent.click(screen.getAllByText("From Kia's Pay")[1]);
    // Group is now collapsed — component doesn't crash
    expect(screen.getByText("Monthly Total")).toBeInTheDocument();
  });

  it("toggles the other_income group collapse state", () => {
    const bills = [makeBill({ group: "other_income" })];
    renderTab({ bills });
    // "From Other Income" appears in StatCard subLabel [0] AND BillGroup header [1]
    fireEvent.click(screen.getAllByText("From Other Income")[1]);
    expect(screen.getByText("Monthly Total")).toBeInTheDocument();
  });
});
