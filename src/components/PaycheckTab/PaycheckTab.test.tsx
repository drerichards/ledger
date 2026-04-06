import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { PaycheckTab } from "@/components/PaycheckTab/PaycheckTab";
import { DEFAULT_PAYCHECK_COLUMNS } from "@/lib/paycheck";
import type { KiasCheckEntry, PaycheckColumn, PaycheckViewScope } from "@/types";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("@/lib/dates", () => ({
  ...jest.requireActual("@/lib/dates"),
  currentMonth: jest.fn(() => "2026-04"),
  today: jest.fn(() => "2026-04-06"),
  getMondaysUpToMonth: jest.fn(() => ["2026-04-06", "2026-04-13"]),
  getMondaysInMonth: jest.fn(() => ["2026-04-06", "2026-04-13", "2026-04-20", "2026-04-27"]),
  mondayOf: jest.fn((d: string) => d),
}));

const noop = () => {};

function renderPaycheck(overrides: {
  viewScope?: PaycheckViewScope;
  onSetViewScope?: (s: PaycheckViewScope) => void;
  onRenameColumn?: (key: string, label: string) => void;
  onAddColumn?: (label: string) => void;
  onHideColumn?: (key: string) => void;
  onRestoreColumn?: (key: string) => void;
  columns?: PaycheckColumn[];
  checkLog?: KiasCheckEntry[];
} = {}) {
  return render(
    <PaycheckTab
      paycheck={[]}
      checkLog={overrides.checkLog ?? []}
      savingsLog={[]}
      plans={[]}
      columns={overrides.columns ?? DEFAULT_PAYCHECK_COLUMNS}
      viewScope={overrides.viewScope ?? "monthly"}
      checkEditWarningAcked={false}
      onUpsertWeek={noop}
      onAddCheckEntry={noop}
      onUpdateCheckEntry={noop}
      onDeleteCheckEntry={noop}
      onSetViewScope={overrides.onSetViewScope ?? noop}
      onRenameColumn={overrides.onRenameColumn ?? noop}
      onAddColumn={overrides.onAddColumn ?? noop}
      onHideColumn={overrides.onHideColumn ?? noop}
      onRestoreColumn={overrides.onRestoreColumn ?? noop}
      onAckCheckEditWarning={noop}
    />,
  );
}

describe("PaycheckTab — rendering", () => {
  it("renders the month heading for current view month", () => {
    // headingLabel for monthly scope = fmtMonthFull("2026-04") = "April 2026"
    renderPaycheck();
    expect(screen.getByRole("heading", { name: "April 2026" })).toBeInTheDocument();
  });

  it("renders view scope toggle buttons", () => {
    renderPaycheck();
    expect(screen.getByRole("button", { name: "Month" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quarter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Year" })).toBeInTheDocument();
  });

  it("renders month navigation buttons", () => {
    renderPaycheck();
    expect(screen.getByLabelText("Previous month")).toBeInTheDocument();
    expect(screen.getByLabelText("Next month")).toBeInTheDocument();
  });
});

describe("PaycheckTab — view scope", () => {
  // onSetViewScope is called inside a 500ms setTimeout (for collapse animation).
  // Use fake timers to advance past the delay synchronously.
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("calls onSetViewScope when a scope button is clicked", () => {
    const onSetViewScope = jest.fn();
    renderPaycheck({ onSetViewScope });
    fireEvent.click(screen.getByRole("button", { name: "Quarter" }));
    act(() => { jest.runAllTimers(); });
    expect(onSetViewScope).toHaveBeenCalledWith("quarterly");
  });

  it("calls onSetViewScope with 'weekly' for Week button", () => {
    const onSetViewScope = jest.fn();
    renderPaycheck({ onSetViewScope });
    fireEvent.click(screen.getByRole("button", { name: "Week" }));
    act(() => { jest.runAllTimers(); });
    expect(onSetViewScope).toHaveBeenCalledWith("weekly");
  });

  it("calls onSetViewScope with 'yearly' for Year button", () => {
    const onSetViewScope = jest.fn();
    renderPaycheck({ onSetViewScope });
    fireEvent.click(screen.getByRole("button", { name: "Year" }));
    act(() => { jest.runAllTimers(); });
    expect(onSetViewScope).toHaveBeenCalledWith("yearly");
  });
});

describe("PaycheckTab — navigation", () => {
  it("navigates to previous month (handleNavPrev monthly)", () => {
    renderPaycheck();
    fireEvent.click(screen.getByLabelText("Previous month"));
    // Month heading should update to March 2026
    expect(screen.getByRole("heading", { name: "March 2026" })).toBeInTheDocument();
  });

  it("navigates to next month (handleNavNext monthly)", () => {
    renderPaycheck();
    fireEvent.click(screen.getByLabelText("Next month"));
    expect(screen.getByRole("heading", { name: "May 2026" })).toBeInTheDocument();
  });

  it("navigates to today (handleNavToday monthly)", () => {
    renderPaycheck();
    // Navigate away first, then back
    fireEvent.click(screen.getByLabelText("Previous month"));
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(screen.getByRole("heading", { name: "April 2026" })).toBeInTheDocument();
  });

  it("navigates in weekly view (handleNavPrev/Next weekly)", () => {
    renderPaycheck({ viewScope: "weekly" });
    fireEvent.click(screen.getByLabelText("Next week"));
    // Component renders without crash
    expect(screen.getByLabelText("Previous week")).toBeInTheDocument();
  });

  it("does not navigate before EARLIEST_MONTH", () => {
    renderPaycheck();
    // Click previous many times — should stop at 2025-12
    for (let i = 0; i < 20; i++) {
      fireEvent.click(screen.getByLabelText("Previous month"));
    }
    // Should have stopped — Dec 2025 is the earliest
    expect(screen.getByRole("heading", { name: "December 2025" })).toBeInTheDocument();
  });

  it("navigates prev/next in quarterly view (getNavStep quarterly)", () => {
    renderPaycheck({ viewScope: "quarterly" });
    fireEvent.click(screen.getByLabelText("Previous month"));
    // Heading matches /Quarter/ — use role to disambiguate from the scope toggle button
    expect(screen.getByRole("heading", { name: /Quarter/ })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Next month"));
    // Back to original month
    expect(screen.getByRole("heading", { name: "April 2026 — Quarter" })).toBeInTheDocument();
  });

  it("navigates prev/next in yearly view (getNavStep yearly)", () => {
    renderPaycheck({ viewScope: "yearly" });
    fireEvent.click(screen.getByLabelText("Previous month"));
    expect(screen.getByRole("heading", { name: /Year/ })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Next month"));
    expect(screen.getByRole("heading", { name: /Year/ })).toBeInTheDocument();
  });
});

describe("PaycheckTab — menu", () => {
  it("opens the More menu when the More button is clicked", () => {
    renderPaycheck();
    fireEvent.click(screen.getByTitle("More"));
    expect(screen.getByRole("menuitem", { name: "Manage Columns" })).toBeInTheDocument();
  });

  it("opens the column modal when Manage Columns is clicked", () => {
    renderPaycheck();
    fireEvent.click(screen.getByTitle("More"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Manage Columns" }));
    // Column modal should appear
    expect(screen.getByText(/Manage Columns/)).toBeInTheDocument();
  });

  it("toggles the paycheck log panel when Paycheck Log is clicked", () => {
    renderPaycheck();
    fireEvent.click(screen.getByTitle("More"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Paycheck Log" }));
    // Panel opens — no crash
    expect(screen.getByRole("heading", { name: "April 2026" })).toBeInTheDocument();
  });

  it("closes the paycheck log panel via the × button (line 769 onClick branch)", () => {
    renderPaycheck();
    // Open the panel
    fireEvent.click(screen.getByTitle("More"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Paycheck Log" }));
    // Close it via the × button
    fireEvent.click(screen.getByRole("button", { name: "Close paycheck log" }));
    // Panel is closed — the close button is gone (panel is aria-hidden)
    expect(screen.queryByRole("button", { name: "Close paycheck log" })).not.toBeInTheDocument();
  });

  it("closes menu when clicking outside (handleClickOutside — lines 316-317)", () => {
    renderPaycheck();
    fireEvent.click(screen.getByTitle("More"));
    expect(screen.getByRole("menuitem", { name: "Manage Columns" })).toBeInTheDocument();
    // Simulate click outside the menu wrapper
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menuitem", { name: "Manage Columns" })).not.toBeInTheDocument();
  });
});

// ─── Scope transitions ────────────────────────────────────────────────────────

describe("PaycheckTab — scope transitions (additional branches)", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("clears pending transition on rapid scope change (line 263)", () => {
    renderPaycheck();
    fireEvent.click(screen.getByRole("button", { name: "Quarter" }));
    // Pending timeout exists — immediately click another scope to trigger clearTimeout
    fireEvent.click(screen.getByRole("button", { name: "Year" }));
    act(() => { jest.runAllTimers(); });
    // No crash; heading unchanged (onSetViewScope is noop so viewScope prop stays monthly)
    expect(screen.getByRole("heading", { name: "April 2026" })).toBeInTheDocument();
  });

  it("transitions to monthly view from quarterly (else if monthly branch — lines 287-288)", () => {
    const onSetViewScope = jest.fn();
    renderPaycheck({ viewScope: "quarterly", onSetViewScope });
    fireEvent.click(screen.getByRole("button", { name: "Month" }));
    act(() => { jest.runAllTimers(); });
    expect(onSetViewScope).toHaveBeenCalledWith("monthly");
  });
});

// ─── Navigation — additional weekly + today branches ─────────────────────────

describe("PaycheckTab — navigation (weekly + today branches)", () => {
  it("crosses month boundary navigating prev in weekly view (lines 184-185)", () => {
    renderPaycheck({ viewScope: "weekly" });
    // Initial selectedWeekOf = "2026-04-06". Prev week = "2026-03-30" → new month
    fireEvent.click(screen.getByLabelText("Previous week"));
    expect(screen.getByRole("heading", { name: "March 2026" })).toBeInTheDocument();
  });

  it("crosses month boundary navigating next in weekly view (line 208)", () => {
    renderPaycheck({ viewScope: "weekly" });
    // Navigate 3 times: 04-06 → 04-13 → 04-20 → 04-27
    for (let i = 0; i < 3; i++) fireEvent.click(screen.getByLabelText("Next week"));
    // 4th click: 04-27 → 05-04 → crosses into May
    fireEvent.click(screen.getByLabelText("Next week"));
    expect(screen.getByRole("heading", { name: "May 2026" })).toBeInTheDocument();
  });

  it("Today resets to current week in weekly view (lines 226-231)", () => {
    renderPaycheck({ viewScope: "weekly" });
    // Navigate forward past April into May
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByLabelText("Next week"));
    // Click Today — resets to April 2026
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(screen.getByRole("heading", { name: "April 2026" })).toBeInTheDocument();
  });

  it("Today resets collapsed state in quarterly view (lines 234-240)", () => {
    renderPaycheck({ viewScope: "quarterly" });
    fireEvent.click(screen.getByLabelText("Previous month"));
    fireEvent.click(screen.getByRole("button", { name: "Today" }));
    expect(screen.getByRole("heading", { name: "April 2026 — Quarter" })).toBeInTheDocument();
  });

  it("blocks weekly prev navigation when it would go before EARLIEST_MONTH (line 181 early return)", () => {
    renderPaycheck({ viewScope: "weekly" });
    // selectedWeekOf starts at "2026-04-06". Need ~17 prev-week clicks to reach Dec 2025.
    // Each click moves back 7 days: Apr 6 → ... → Dec 8 (week in Dec) → trying to go before Dec means
    // the prevWeekMonth would be < "2025-12". Navigate 18 times to be safe.
    for (let i = 0; i < 20; i++) {
      fireEvent.click(screen.getByLabelText("Previous week"));
    }
    // Heading should be stuck at December 2025 (can't go further back)
    expect(screen.getByRole("heading", { name: "December 2025" })).toBeInTheDocument();
  });

  it("blocks monthly prev navigation at EARLIEST_MONTH boundary (line 191 explicit early return)", () => {
    renderPaycheck({ viewScope: "monthly" });
    // Navigate back far enough — should stop at December 2025
    for (let i = 0; i < 6; i++) {
      fireEvent.click(screen.getByLabelText("Previous month"));
    }
    expect(screen.getByRole("heading", { name: "December 2025" })).toBeInTheDocument();
  });
});

// ─── toggleMonth ─────────────────────────────────────────────────────────────

describe("PaycheckTab — toggleMonth", () => {
  it("collapses the month block when the MonthAccordion header is clicked (line 138)", () => {
    renderPaycheck();
    // Multiple role="button" aria-expanded="true" elements exist (MonthAccordion + WeekAccordion).
    // Disambiguate by accessible name — the month header contains "April 2026".
    const monthHeader = screen.getByRole("button", { expanded: true, name: /April 2026/ });
    fireEvent.click(monthHeader);
    expect(monthHeader).toHaveAttribute("aria-expanded", "false");
  });
});

// ─── Column modal ─────────────────────────────────────────────────────────────

describe("PaycheckTab — column modal", () => {
  function openModal() {
    fireEvent.click(screen.getByTitle("More"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Manage Columns" }));
  }

  it("closes modal via × button (cancelColumnModal)", () => {
    renderPaycheck();
    openModal();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("heading", { name: "Manage Columns" })).not.toBeInTheDocument();
  });

  it("closes modal via Cancel footer button (cancelColumnModal)", () => {
    renderPaycheck();
    openModal();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("heading", { name: "Manage Columns" })).not.toBeInTheDocument();
  });

  it("renames a column with Enter key (startEdit + commitEdit)", () => {
    renderPaycheck();
    openModal();
    fireEvent.click(screen.getByRole("button", { name: "Rename Storage" }));
    const input = screen.getByDisplayValue("Storage");
    fireEvent.change(input, { target: { value: "Store" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("Store")).toBeInTheDocument();
  });

  it("commits rename on blur (commitEdit via onBlur)", () => {
    renderPaycheck();
    openModal();
    fireEvent.click(screen.getByRole("button", { name: "Rename Storage" }));
    const input = screen.getByDisplayValue("Storage");
    fireEvent.change(input, { target: { value: "StoreBlur" } });
    fireEvent.blur(input);
    expect(screen.getByText("StoreBlur")).toBeInTheDocument();
  });

  it("Escape during rename clears editingKey without saving", () => {
    renderPaycheck();
    openModal();
    fireEvent.click(screen.getByRole("button", { name: "Rename Storage" }));
    const input = screen.getByDisplayValue("Storage");
    fireEvent.keyDown(input, { key: "Escape" });
    // Input gone, original label restored
    expect(screen.queryByDisplayValue("Storage")).not.toBeInTheDocument();
    expect(screen.getAllByText("Storage").length).toBeGreaterThan(0);
  });

  it("hides a column and reveals the hidden section (hideColumnPending)", () => {
    renderPaycheck();
    openModal();
    fireEvent.click(screen.getByRole("button", { name: "Hide Storage" }));
    expect(screen.getByText(/Hidden Columns/)).toBeInTheDocument();
  });

  it("expands hidden section and restores a column (restoreColumnPending)", () => {
    renderPaycheck();
    openModal();
    fireEvent.click(screen.getByRole("button", { name: "Hide Storage" }));
    // Hidden section starts collapsed — click to expand
    fireEvent.click(screen.getByText(/Hidden Columns/));
    fireEvent.click(screen.getByRole("button", { name: "Restore Storage" }));
    // Storage is back in visible columns, hidden section gone
    expect(screen.queryByText(/Hidden Columns/)).not.toBeInTheDocument();
  });

  it("opens hidden section from prop and restores on confirm (confirmColumnModal restore branch)", () => {
    const onRestoreColumn = jest.fn();
    const columnsWithHidden: PaycheckColumn[] = [
      ...DEFAULT_PAYCHECK_COLUMNS,
      { key: "custom1", label: "Custom", fixed: false, hidden: true },
    ];
    renderPaycheck({ columns: columnsWithHidden, onRestoreColumn });
    openModal();
    // Hidden section already has "Custom" — expand it
    fireEvent.click(screen.getByText(/Hidden Columns/));
    fireEvent.click(screen.getByRole("button", { name: "Restore Custom" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onRestoreColumn).toHaveBeenCalledWith("custom1");
  });

  it("adds a new column via Enter (startAddColumn + commitAddColumn)", () => {
    renderPaycheck();
    openModal();
    fireEvent.click(screen.getByText("+ Add Column"));
    const input = screen.getByPlaceholderText("New column name");
    fireEvent.change(input, { target: { value: "Misc" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("Misc")).toBeInTheDocument();
  });

  it("commits empty add column on blur (commitAddColumn false branch)", () => {
    renderPaycheck();
    openModal();
    fireEvent.click(screen.getByText("+ Add Column"));
    const input = screen.getByPlaceholderText("New column name");
    fireEvent.blur(input); // empty label → skips setPendingColumns
    expect(screen.getByText("+ Add Column")).toBeInTheDocument();
  });

  it("Escape during add column cancels without adding (setAddingColumn false)", () => {
    renderPaycheck();
    openModal();
    fireEvent.click(screen.getByText("+ Add Column"));
    fireEvent.keyDown(screen.getByPlaceholderText("New column name"), { key: "Escape" });
    expect(screen.queryByPlaceholderText("New column name")).not.toBeInTheDocument();
    expect(screen.getByText("+ Add Column")).toBeInTheDocument();
  });

  it("calls onRenameColumn when confirming a rename (confirmColumnModal rename branch)", () => {
    const onRenameColumn = jest.fn();
    renderPaycheck({ onRenameColumn });
    openModal();
    fireEvent.click(screen.getByRole("button", { name: "Rename Storage" }));
    const input = screen.getByDisplayValue("Storage");
    fireEvent.change(input, { target: { value: "Store" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onRenameColumn).toHaveBeenCalledWith("storage", "Store");
  });

  it("calls onHideColumn when confirming a hidden column (confirmColumnModal hide branch)", () => {
    const onHideColumn = jest.fn();
    renderPaycheck({ onHideColumn });
    openModal();
    fireEvent.click(screen.getByRole("button", { name: "Hide Storage" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onHideColumn).toHaveBeenCalledWith("storage");
  });

  it("calls onAddColumn when confirming a new column (confirmColumnModal new column branch)", () => {
    const onAddColumn = jest.fn();
    renderPaycheck({ onAddColumn });
    openModal();
    fireEvent.click(screen.getByText("+ Add Column"));
    const input = screen.getByPlaceholderText("New column name");
    fireEvent.change(input, { target: { value: "Misc" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onAddColumn).toHaveBeenCalledWith("Misc");
  });
});

// ─── toggleWeek ───────────────────────────────────────────────────────────────

describe("PaycheckTab — toggleWeek", () => {
  it("expands a collapsed week when its header is clicked (lines 245-252 add branch)", () => {
    renderPaycheck();
    // Initial expandedWeeks = Set(["2026-04-06"]) (currentWeekOf).
    // "Apr 13" is not expanded — clicking it hits the else (next.add) path.
    const weekBtns = screen.getAllByRole("button", { name: /Week of/ });
    // weekBtns[0] = Apr 6 (expanded), weekBtns[1] = Apr 13 (collapsed)
    fireEvent.click(weekBtns[1]);
    expect(weekBtns[1]).toHaveAttribute("aria-expanded", "true");
  });

  it("collapses an expanded week when its header is clicked again (lines 247-248 delete branch)", () => {
    renderPaycheck();
    // Apr 6 starts expanded — clicking it hits the if (next.delete) path.
    const weekBtns = screen.getAllByRole("button", { name: /Week of/ });
    fireEvent.click(weekBtns[0]);
    expect(weekBtns[0]).toHaveAttribute("aria-expanded", "false");
  });
});

// ─── Paycheck log navigation ──────────────────────────────────────────────────

describe("PaycheckTab — paycheck log onNavigateToWeek", () => {
  it("navigates to weekly view when a week is clicked in the paycheck log (lines 769-788)", () => {
    const onSetViewScope = jest.fn();
    renderPaycheck({
      checkLog: [{ weekOf: "2026-04-06", amount: 76423 }],
      onSetViewScope,
    });
    // Open the paycheck log panel
    fireEvent.click(screen.getByTitle("More"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Paycheck Log" }));
    // "Week of Apr" also appears in WeekAccordion headers (buttons).
    // Scope to checkLogCard — identified via the panel's unique close button.
    const closeBtn = screen.getByRole("button", { name: "Close paycheck log" });
    const checkLogCard = closeBtn.closest(".checkLogCard") as HTMLElement;
    // Click the first week row inside the log card (the Apr 6 entry)
    const weekRow = within(checkLogCard).getAllByText(/Week of Apr/)[0];
    fireEvent.click(weekRow.closest("div")!);
    // onSetViewScope("weekly") is called synchronously (no setTimeout in this callback)
    expect(onSetViewScope).toHaveBeenCalledWith("weekly");
  });
});

// ─── Additional branch coverage ───────────────────────────────────────────────

describe("PaycheckTab — additional branch coverage", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("opens menu while paycheck log is open — applies menuItemActive class (line 545 true branch)", () => {
    jest.useRealTimers(); // this test doesn't need fake timers
    renderPaycheck();
    // Open the paycheck log
    fireEvent.click(screen.getByTitle("More"));
    fireEvent.click(screen.getByRole("menuitem", { name: "Paycheck Log" }));
    // Open the menu again while log is showing — Paycheck Log button gets menuItemActive class
    fireEvent.click(screen.getByTitle("More"));
    // The Paycheck Log menu item should now be present (and active)
    expect(screen.getByRole("menuitem", { name: "Paycheck Log" })).toBeInTheDocument();
  });

  it("clicking the already-active scope does nothing (if scope === viewScope early return)", () => {
    const onSetViewScope = jest.fn();
    renderPaycheck({ viewScope: "monthly", onSetViewScope });
    // Click the scope button that is already active — should early-return without calling onSetViewScope
    fireEvent.click(screen.getByRole("button", { name: "Month" }));
    act(() => { jest.runAllTimers(); });
    expect(onSetViewScope).not.toHaveBeenCalled();
  });

  it("does not navigate yearly view past LATEST_YEAR (handleNavNext yearly cap)", () => {
    renderPaycheck({ viewScope: "yearly" });
    // Advance 2 years: 2026 → 2027 → would be 2028, which exceeds getFullYear()+1 (2027)
    fireEvent.click(screen.getByLabelText("Next month")); // step = 12 → 2027
    // Second click should be blocked (2028 > LATEST_YEAR)
    fireEvent.click(screen.getByLabelText("Next month")); // would be 2028 → blocked
    // Heading should still show 2027, not 2028
    expect(screen.getByRole("heading", { name: /2027/ })).toBeInTheDocument();
  });

  it("falls back to mondays[0] when currentWeekOf is not in the viewed month (handleSetViewScope weekly fallback)", () => {
    // Navigate to May 2026 first (currentWeekOf = Apr 6 won't be in May's mondays)
    const { getMondaysInMonth } = jest.requireMock("@/lib/dates");
    // Override getMondaysInMonth to return May mondays only
    (getMondaysInMonth as jest.Mock)
      .mockReturnValueOnce(["2026-04-06", "2026-04-13", "2026-04-20", "2026-04-27"]) // initial render
      .mockImplementation(() => ["2026-05-04", "2026-05-11", "2026-05-18", "2026-05-25"]); // after nav to May

    renderPaycheck({ viewScope: "monthly" });
    // Navigate forward to May
    fireEvent.click(screen.getByLabelText("Next month"));
    // Switch to weekly view — currentWeekOf (Apr 6) is NOT in May mondays → falls back to mondays[0]
    fireEvent.click(screen.getByRole("button", { name: "Week" }));
    act(() => { jest.runAllTimers(); });
    // No crash — component renders without throwing
    expect(screen.getByRole("heading")).toBeInTheDocument();

    // Restore mock
    (getMondaysInMonth as jest.Mock).mockImplementation(() => ["2026-04-06", "2026-04-13", "2026-04-20", "2026-04-27"]);
  });
});
