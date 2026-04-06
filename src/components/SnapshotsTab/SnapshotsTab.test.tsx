import { render, screen } from "@testing-library/react";
import { SnapshotsTab } from "@/components/SnapshotsTab";
import type { MonthSnapshot } from "@/types";

function makeSnapshot(overrides: Partial<MonthSnapshot> = {}): MonthSnapshot {
  return {
    month: "2026-04",
    totalBilled: 259863,
    totalPaid: 100000,
    shortfall: 24726,
    savingsMoved: 5000,
    kiasPayActual: 300000,
    ...overrides,
  };
}

describe("SnapshotsTab — empty state", () => {
  it("renders empty state message when no snapshots", () => {
    render(<SnapshotsTab snapshots={[]} />);
    expect(screen.getByText(/No monthly summaries yet/)).toBeInTheDocument();
  });

  it("does not render a table when empty", () => {
    render(<SnapshotsTab snapshots={[]} />);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("SnapshotsTab — with snapshots", () => {
  it("renders a row for each snapshot", () => {
    const snapshots = [
      makeSnapshot({ month: "2026-04" }),
      makeSnapshot({ month: "2026-03", totalBilled: 200000 }),
    ];
    render(<SnapshotsTab snapshots={snapshots} />);
    // fmtMonthFull("2026-04") = "April 2026"
    expect(screen.getByText("April 2026")).toBeInTheDocument();
    expect(screen.getByText("March 2026")).toBeInTheDocument();
  });

  it("sorts snapshots newest-first", () => {
    const snapshots = [
      makeSnapshot({ month: "2026-03" }),
      makeSnapshot({ month: "2026-05" }),
      makeSnapshot({ month: "2026-04" }),
    ];
    render(<SnapshotsTab snapshots={snapshots} />);
    const rows = screen.getAllByRole("row").slice(1); // skip header
    expect(rows[0]).toHaveTextContent("May 2026");
    expect(rows[1]).toHaveTextContent("April 2026");
    expect(rows[2]).toHaveTextContent("March 2026");
  });

  it("renders the heading", () => {
    render(<SnapshotsTab snapshots={[makeSnapshot()]} />);
    expect(screen.getByRole("heading", { name: "Snapshots" })).toBeInTheDocument();
  });

  it("renders billed amount formatted as money", () => {
    render(<SnapshotsTab snapshots={[makeSnapshot({ totalBilled: 259863 })]} />);
    expect(screen.getByText("$2,598.63")).toBeInTheDocument();
  });

  it("shows − prefix for shortfall (short)", () => {
    render(<SnapshotsTab snapshots={[makeSnapshot({ shortfall: 24726 })]} />);
    expect(screen.getByText(/−\$247\.26/)).toBeInTheDocument();
  });

  it("shows + prefix for surplus (shortfall < 0)", () => {
    render(<SnapshotsTab snapshots={[makeSnapshot({ shortfall: -10000 })]} />);
    expect(screen.getByText(/\+\$100\.00/)).toBeInTheDocument();
  });
});
