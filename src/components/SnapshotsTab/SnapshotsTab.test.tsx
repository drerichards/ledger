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
});

describe("SnapshotsTab — with snapshots", () => {
  it("renders a card for each snapshot", () => {
    const snapshots = [
      makeSnapshot({ month: "2026-04" }),
      makeSnapshot({ month: "2026-03", totalBilled: 200000 }),
    ];
    render(<SnapshotsTab snapshots={snapshots} />);
    // fmtMonthFull("2026-04") = "April 2026"
    expect(screen.getByText("April 2026")).toBeInTheDocument();
    expect(screen.getByText("March 2026")).toBeInTheDocument();
  });

  it("sorts snapshot cards newest-first", () => {
    const snapshots = [
      makeSnapshot({ month: "2026-03" }),
      makeSnapshot({ month: "2026-05" }),
      makeSnapshot({ month: "2026-04" }),
    ];
    const { container } = render(<SnapshotsTab snapshots={snapshots} />);
    // CSS modules hash class names, so match substring on "snapshotMonth"
    const monthCells = container.querySelectorAll("[class*='snapshotMonth']");
    const texts = Array.from(monthCells).map((el) => el.textContent);
    expect(texts).toEqual(["May 2026", "April 2026", "March 2026"]);
  });

  it("renders billed amount formatted as money", () => {
    render(<SnapshotsTab snapshots={[makeSnapshot({ totalBilled: 259863 })]} />);
    expect(screen.getByText("$2,598.63")).toBeInTheDocument();
  });

  it("shows − prefix for shortfall", () => {
    render(<SnapshotsTab snapshots={[makeSnapshot({ shortfall: 24726 })]} />);
    // Appears in both the trend bar (avg surplus) and the card's Net pill
    expect(screen.getAllByText(/−\$247\.26/).length).toBeGreaterThan(0);
  });

  it("shows + prefix for surplus (shortfall < 0)", () => {
    render(<SnapshotsTab snapshots={[makeSnapshot({ shortfall: -10000 })]} />);
    expect(screen.getAllByText(/\+\$100\.00/).length).toBeGreaterThan(0);
  });
});
