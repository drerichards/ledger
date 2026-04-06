import { render, screen } from "@testing-library/react";
import { ActivityTab } from "@/components/ActivityTab";
import type { Bill } from "@/types";

// ─── Mock useAppState ─────────────────────────────────────────────────────────

const mockState = { bills: [] as Bill[] };

jest.mock("@/hooks/useAppState", () => ({
  useAppState: () => ({ state: mockState }),
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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ActivityTab — empty state", () => {
  beforeEach(() => { mockState.bills = []; });

  it("renders the heading", () => {
    render(<ActivityTab />);
    expect(screen.getByRole("heading", { name: "Activity" })).toBeInTheDocument();
  });

  it("renders empty state message when no amount changes exist", () => {
    render(<ActivityTab />);
    expect(screen.getByText(/No amount changes recorded yet/)).toBeInTheDocument();
  });
});

describe("ActivityTab — with history", () => {
  beforeEach(() => {
    mockState.bills = [
      makeBill({
        id: "b1",
        name: "T-Mobile",
        cents: 12000, // current value
        amountHistory: [
          { date: "2026-03-01", cents: 10800 }, // old → new was 12000
        ],
      }),
    ];
  });

  it("renders a row for each amount change event", () => {
    render(<ActivityTab />);
    expect(screen.getByText("T-Mobile")).toBeInTheDocument();
  });

  it("renders the date of the change", () => {
    render(<ActivityTab />);
    expect(screen.getByText("Mar 1, 2026")).toBeInTheDocument();
  });

  it("shows the old amount (from)", () => {
    render(<ActivityTab />);
    expect(screen.getByText("$108.00")).toBeInTheDocument();
  });

  it("shows the new amount (to)", () => {
    render(<ActivityTab />);
    expect(screen.getByText("$120.00")).toBeInTheDocument();
  });

  it("shows the difference with + prefix for increases", () => {
    render(<ActivityTab />);
    // diff = 12000 - 10800 = 1200 → "+$12.00"
    expect(screen.getByText(/\+\$12\.00/)).toBeInTheDocument();
  });

  it("does not render the empty state message", () => {
    render(<ActivityTab />);
    expect(screen.queryByText(/No amount changes recorded yet/)).not.toBeInTheDocument();
  });
});

describe("ActivityTab — bill with no amountHistory", () => {
  it("skips bills with empty amountHistory (continue branch)", () => {
    // A bill exists in state but has never had an amount change.
    // buildActivityLog should skip it and show the empty state message.
    mockState.bills = [makeBill({ amountHistory: [] })];
    render(<ActivityTab />);
    expect(screen.getByText(/No amount changes recorded yet/)).toBeInTheDocument();
  });

  it("skips bills with undefined amountHistory", () => {
    const bill = makeBill();
    // @ts-expect-error — testing the undefined guard on line 29
    bill.amountHistory = undefined;
    mockState.bills = [bill];
    render(<ActivityTab />);
    expect(screen.getByText(/No amount changes recorded yet/)).toBeInTheDocument();
  });
});

describe("ActivityTab — decrease change", () => {
  beforeEach(() => {
    mockState.bills = [
      makeBill({
        cents: 8000,
        amountHistory: [{ date: "2026-03-15", cents: 10000 }],
      }),
    ];
  });

  it("shows − prefix for decreases", () => {
    render(<ActivityTab />);
    // diff = 8000 - 10000 = -2000 → "−$20.00"
    expect(screen.getByText(/−\$20\.00/)).toBeInTheDocument();
  });
});

describe("ActivityTab — sort comparator coverage", () => {
  it("sorts events newest-first when multiple history entries exist (invokes sort comparator)", () => {
    // Two bills with history — results in ≥2 events, forcing the sort comparator to run.
    mockState.bills = [
      makeBill({
        id: "b1",
        name: "T-Mobile",
        cents: 12000,
        amountHistory: [{ date: "2026-02-01", cents: 10800 }],
      }),
      makeBill({
        id: "b2",
        name: "Netflix",
        cents: 1800,
        amountHistory: [{ date: "2026-03-01", cents: 1500 }],
      }),
    ];
    render(<ActivityTab />);
    const rows = screen.getAllByRole("row").slice(1); // skip header
    // Newest first: Mar 1 before Feb 1
    expect(rows[0]).toHaveTextContent("Mar 1, 2026");
    expect(rows[1]).toHaveTextContent("Feb 1, 2026");
  });
});
