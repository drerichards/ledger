import { render, screen, fireEvent } from "@testing-library/react";
import { CheckLog } from "./CheckLog";
import type { KiasCheckEntry } from "@/types";
import { currentMonth, getMondaysUpToMonth } from "@/lib/dates";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Lock current month so date ranges are deterministic
jest.mock("@/lib/dates", () => ({
  ...jest.requireActual("@/lib/dates"),
  currentMonth: jest.fn(() => "2026-04"),
  // Return just a small, predictable set of Mondays
  getMondaysUpToMonth: jest.fn(() => [
    "2026-04-27",
    "2026-04-20",
    "2026-04-13",
    "2026-04-06",
  ]),
  mondayOf: jest.fn((d: string) => d), // identity — all entries already Monday-keyed
}));

// ─── Factory ──────────────────────────────────────────────────────────────────

function makeEntry(overrides: Partial<KiasCheckEntry> = {}): KiasCheckEntry {
  return { weekOf: "2026-04-06", amount: 76423, ...overrides };
}

const noop = () => {};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("CheckLog — rendering", () => {
  it("renders year-grouped sections", () => {
    render(<CheckLog log={[]} baseline={null} onAdd={noop} />);
    expect(screen.getByText("2026")).toBeInTheDocument();
  });

  it("shows week rows for each Monday in the range", () => {
    render(<CheckLog log={[]} baseline={null} onAdd={noop} />);
    expect(screen.getAllByText(/Week of/).length).toBeGreaterThan(0);
  });

  it("shows stored amount for logged weeks", () => {
    const log = [makeEntry({ weekOf: "2026-04-06", amount: 76423 })];
    render(<CheckLog log={log} baseline={null} onAdd={noop} />);
    expect(screen.getByText("$764.23")).toBeInTheDocument();
  });

  it("shows dash for unlogged weeks", () => {
    render(<CheckLog log={[]} baseline={null} onAdd={noop} />);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("renders baseline stats when baseline is provided", () => {
    const baseline = { average: 76000, low: 70000, high: 82000, sampleSize: 8 };
    render(<CheckLog log={[]} baseline={baseline} onAdd={noop} />);
    expect(screen.getByText("Average")).toBeInTheDocument();
    expect(screen.getByText("$760.00")).toBeInTheDocument();
  });
});

describe("CheckLog — editing", () => {
  it("starts editing when a row is clicked in edit mode", () => {
    render(<CheckLog log={[]} baseline={null} onAdd={noop} />);
    // Click the first week row
    const weekRows = screen.getAllByText(/Week of/);
    fireEvent.click(weekRows[0].closest("[class]")!);
    // Edit input appears
    expect(screen.getByPlaceholderText("0.00")).toBeInTheDocument();
  });

  it("calls onAdd when ✓ is clicked with a valid amount", () => {
    const onAdd = jest.fn();
    render(<CheckLog log={[]} baseline={null} onAdd={onAdd} />);
    const weekRows = screen.getAllByText(/Week of/);
    fireEvent.click(weekRows[0].closest("[class]")!);
    const input = screen.getByPlaceholderText("0.00");
    fireEvent.change(input, { target: { value: "764.23" } });
    fireEvent.click(screen.getByTitle("Save"));
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 76423 }),
    );
  });

  it("cancels editing when ✕ is clicked", () => {
    render(<CheckLog log={[]} baseline={null} onAdd={noop} />);
    const weekRows = screen.getAllByText(/Week of/);
    fireEvent.click(weekRows[0].closest("[class]")!);
    fireEvent.click(screen.getByTitle("Cancel"));
    expect(screen.queryByPlaceholderText("0.00")).not.toBeInTheDocument();
  });

  it("cancels editing on Escape key", () => {
    render(<CheckLog log={[]} baseline={null} onAdd={noop} />);
    const weekRows = screen.getAllByText(/Week of/);
    fireEvent.click(weekRows[0].closest("[class]")!);
    const input = screen.getByPlaceholderText("0.00");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByPlaceholderText("0.00")).not.toBeInTheDocument();
  });

  it("commits editing on Enter key", () => {
    const onAdd = jest.fn();
    render(<CheckLog log={[]} baseline={null} onAdd={onAdd} />);
    const weekRows = screen.getAllByText(/Week of/);
    fireEvent.click(weekRows[0].closest("[class]")!);
    const input = screen.getByPlaceholderText("0.00");
    fireEvent.change(input, { target: { value: "500" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("clicking the edit input does not propagate to the row (line 351 stopPropagation)", () => {
    render(<CheckLog log={[]} baseline={null} onAdd={noop} />);
    const weekRows = screen.getAllByText(/Week of/);
    fireEvent.click(weekRows[0].closest("[class]")!);
    const input = screen.getByPlaceholderText("0.00");
    // Click the input itself — stopPropagation prevents a second startEdit
    fireEvent.click(input);
    // Still in edit mode (not double-toggled off)
    expect(screen.getByPlaceholderText("0.00")).toBeInTheDocument();
  });
});

describe("CheckLog — collapse/expand", () => {
  it("collapses a year section on header click", () => {
    render(<CheckLog log={[]} baseline={null} onAdd={noop} upToMonth="2026-04" />);
    const yearBtn = screen.getByText("2026").closest("button")!;
    fireEvent.click(yearBtn); // collapse
    // Week rows should no longer be visible
    expect(screen.queryAllByText(/Week of/).length).toBe(0);
  });

  it("re-expands a collapsed year section", () => {
    render(<CheckLog log={[]} baseline={null} onAdd={noop} upToMonth="2026-04" />);
    const yearBtn = screen.getByText("2026").closest("button")!;
    fireEvent.click(yearBtn); // collapse
    fireEvent.click(yearBtn); // re-expand
    expect(screen.getAllByText(/Week of/).length).toBeGreaterThan(0);
  });
});

describe("CheckLog — readOnly mode", () => {
  it("calls onNavigateToWeek when a row is clicked in readOnly mode", () => {
    const onNavigateToWeek = jest.fn();
    render(
      <CheckLog
        log={[]}
        baseline={null}
        onAdd={noop}
        readOnly
        onNavigateToWeek={onNavigateToWeek}
      />,
    );
    const weekRows = screen.getAllByText(/Week of/);
    fireEvent.click(weekRows[0].closest("[class]")!);
    expect(onNavigateToWeek).toHaveBeenCalledTimes(1);
  });

  it("does not start editing when in readOnly mode", () => {
    render(<CheckLog log={[]} baseline={null} onAdd={noop} readOnly />);
    const weekRows = screen.getAllByText(/Week of/);
    fireEvent.click(weekRows[0].closest("[class]")!);
    expect(screen.queryByPlaceholderText("0.00")).not.toBeInTheDocument();
  });
});

// ─── Older year auto-collapsed ────────────────────────────────────────────────

describe("CheckLog — older year starts collapsed", () => {
  it("2025 group starts collapsed while 2026 group is expanded (line 106)", () => {
    (getMondaysUpToMonth as jest.Mock).mockReturnValueOnce([
      "2026-04-06",
      "2025-12-08",
    ]);
    render(<CheckLog log={[]} baseline={null} onAdd={noop} />);
    // Both year labels present
    expect(screen.getByText("2026")).toBeInTheDocument();
    expect(screen.getByText("2025")).toBeInTheDocument();
    // Only the 2026 group is expanded — its single row is visible
    // 2025 is collapsed so its week rows are hidden
    const weekRows = screen.getAllByText(/Week of/);
    expect(weekRows.length).toBe(1);
  });
});

// ─── Historical edit confirmation ─────────────────────────────────────────────

describe("CheckLog — historical edit confirmation", () => {
  // Advance currentMonth to "2026-05" so all April entries are historical.
  // Reduce getMondaysUpToMonth to one row so getByText(/Week of/) is unambiguous.
  beforeEach(() => {
    (currentMonth as jest.Mock).mockReturnValue("2026-05");
    (getMondaysUpToMonth as jest.Mock).mockReturnValue(["2026-04-27"]);
  });
  afterEach(() => {
    (currentMonth as jest.Mock).mockReturnValue("2026-04");
    (getMondaysUpToMonth as jest.Mock).mockReturnValue([
      "2026-04-27",
      "2026-04-20",
      "2026-04-13",
      "2026-04-06",
    ]);
  });

  function setupHistoricalRow() {
    const onAdd = jest.fn();
    render(
      <CheckLog
        log={[makeEntry({ weekOf: "2026-04-27", amount: 50000 })]}
        baseline={null}
        onAdd={onAdd}
      />,
    );
    return { onAdd };
  }

  it("shows confirmation modal when editing a historical entry with a changed value (lines 151-152)", () => {
    setupHistoricalRow();
    fireEvent.click(screen.getByText(/Week of/).closest("[class]")!);
    const input = screen.getByPlaceholderText("0.00");
    fireEvent.change(input, { target: { value: "600.00" } });
    fireEvent.click(screen.getByTitle("Save"));
    expect(screen.getByText("Edit Historical Entry?")).toBeInTheDocument();
  });

  it("confirms historical edit and calls onAdd with editHistory appended (lines 164-187)", () => {
    const { onAdd } = setupHistoricalRow();
    fireEvent.click(screen.getByText(/Week of/).closest("[class]")!);
    fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "600.00" } });
    fireEvent.click(screen.getByTitle("Save"));
    fireEvent.click(screen.getByText("Confirm Edit"));
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        weekOf: "2026-04-27",
        amount: 60000,
        editHistory: expect.arrayContaining([
          expect.objectContaining({ oldAmount: 50000, newAmount: 60000 }),
        ]),
      }),
    );
  });

  it("cancels historical edit confirmation and stays in edit mode (line 191)", () => {
    setupHistoricalRow();
    fireEvent.click(screen.getByText(/Week of/).closest("[class]")!);
    fireEvent.change(screen.getByPlaceholderText("0.00"), { target: { value: "600.00" } });
    fireEvent.click(screen.getByTitle("Save"));
    // Modal is shown — cancel it
    fireEvent.click(screen.getByText("Cancel"));
    // Modal dismissed
    expect(screen.queryByText("Edit Historical Entry?")).not.toBeInTheDocument();
    // Still in edit mode (cancelHistoricalEdit keeps editingDate set)
    expect(screen.getByPlaceholderText("0.00")).toBeInTheDocument();
  });
});

// ─── Edit history popover ─────────────────────────────────────────────────────

describe("CheckLog — edit history popover", () => {
  const singleHistory = [
    { editedAt: "2026-04-07T10:00:00.000Z", oldAmount: 70000, newAmount: 76000 },
  ];

  it("shows edit indicator button when entry has editHistory (line 276)", () => {
    const log = [makeEntry({ editHistory: singleHistory })];
    render(<CheckLog log={log} baseline={null} onAdd={noop} />);
    expect(screen.getByTitle("View edit history")).toBeInTheDocument();
  });

  it("opens history popover when edit indicator is clicked (lines 280-326)", () => {
    const log = [makeEntry({ editHistory: singleHistory })];
    render(<CheckLog log={log} baseline={null} onAdd={noop} />);
    fireEvent.click(screen.getByTitle("View edit history"));
    expect(screen.getByText("Last Edit")).toBeInTheDocument();
  });

  it("closes popover when backdrop is clicked", () => {
    const log = [makeEntry({ editHistory: singleHistory })];
    const { container } = render(<CheckLog log={log} baseline={null} onAdd={noop} />);
    fireEvent.click(screen.getByTitle("View edit history"));
    // The backdrop div sits behind the popover — find it via container
    const backdrop = container.querySelector("[class*='popoverBackdrop']");
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(screen.queryByText("Last Edit")).not.toBeInTheDocument();
  });

  it("toggles popover off when indicator is clicked again", () => {
    const log = [makeEntry({ editHistory: singleHistory })];
    render(<CheckLog log={log} baseline={null} onAdd={noop} />);
    fireEvent.click(screen.getByTitle("View edit history")); // open
    fireEvent.click(screen.getByTitle("View edit history")); // close
    expect(screen.queryByText("Last Edit")).not.toBeInTheDocument();
  });

  it("shows 'View all X edits' button when editHistory.length > 1 (line 351)", () => {
    const log = [
      makeEntry({
        editHistory: [
          { editedAt: "2026-04-06T10:00:00.000Z", oldAmount: 70000, newAmount: 76000 },
          { editedAt: "2026-04-07T10:00:00.000Z", oldAmount: 76000, newAmount: 80000 },
        ],
      }),
    ];
    render(<CheckLog log={log} baseline={null} onAdd={noop} />);
    fireEvent.click(screen.getByTitle("View edit history"));
    expect(screen.getByText(/View all 2 edits/)).toBeInTheDocument();
  });

  it("clicking 'View all edits' closes the popover (setShowHistoryFor null)", () => {
    const log = [
      makeEntry({
        editHistory: [
          { editedAt: "2026-04-06T10:00:00.000Z", oldAmount: 70000, newAmount: 76000 },
          { editedAt: "2026-04-07T10:00:00.000Z", oldAmount: 76000, newAmount: 80000 },
        ],
      }),
    ];
    render(<CheckLog log={log} baseline={null} onAdd={noop} />);
    fireEvent.click(screen.getByTitle("View edit history"));
    fireEvent.click(screen.getByText(/View all 2 edits/));
    expect(screen.queryByText("Last Edit")).not.toBeInTheDocument();
  });
});
