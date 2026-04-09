import { render, screen } from "@testing-library/react";
import { ActivityTab } from "@/components/ActivityTab";
import type { Bill, Milestone } from "@/types";

// ─── Mock useAppState ─────────────────────────────────────────────────────────

const mockState = { bills: [] as Bill[], milestones: [] as Milestone[] };

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

function makeMilestone(overrides: Partial<Milestone> = {}): Milestone {
  return {
    id: "affirm_payoff:plan-1",
    type: "affirm_payoff",
    payload: { label: "Samsung TV", mc: 15000, month: "2026-03" },
    achievedAt: "2026-04-01T00:00:00Z",
    seen: false,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ActivityTab — empty state", () => {
  beforeEach(() => {
    mockState.bills = [];
    mockState.milestones = [];
  });

  it("renders the heading", () => {
    render(<ActivityTab />);
    expect(screen.getByRole("heading", { name: "Activity" })).toBeInTheDocument();
  });

  it("renders empty state message when no activity exists", () => {
    render(<ActivityTab />);
    expect(screen.getByText(/No activity recorded yet/)).toBeInTheDocument();
  });
});

describe("ActivityTab — with bill history", () => {
  beforeEach(() => {
    mockState.milestones = [];
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
    expect(screen.queryByText(/No activity recorded yet/)).not.toBeInTheDocument();
  });
});

describe("ActivityTab — bill with no amountHistory", () => {
  beforeEach(() => { mockState.milestones = []; });

  it("skips bills with empty amountHistory (continue branch)", () => {
    mockState.bills = [makeBill({ amountHistory: [] })];
    render(<ActivityTab />);
    expect(screen.getByText(/No activity recorded yet/)).toBeInTheDocument();
  });

  it("skips bills with undefined amountHistory", () => {
    const bill = makeBill();
    // @ts-expect-error — testing the undefined guard
    bill.amountHistory = undefined;
    mockState.bills = [bill];
    render(<ActivityTab />);
    expect(screen.getByText(/No activity recorded yet/)).toBeInTheDocument();
  });
});

describe("ActivityTab — decrease change", () => {
  beforeEach(() => {
    mockState.milestones = [];
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
  it("sorts events newest-first when multiple history entries exist", () => {
    mockState.milestones = [];
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

describe("ActivityTab — milestones", () => {
  beforeEach(() => {
    mockState.bills = [];
  });

  it("renders a milestone row when a milestone exists", () => {
    mockState.milestones = [makeMilestone()];
    render(<ActivityTab />);
    expect(screen.getByText("Samsung TV is paid off")).toBeInTheDocument();
  });

  it("renders the milestone date", () => {
    mockState.milestones = [makeMilestone()];
    render(<ActivityTab />);
    expect(screen.getByText("Apr 1, 2026")).toBeInTheDocument();
  });

  it("renders milestone emoji", () => {
    mockState.milestones = [makeMilestone({ type: "affirm_payoff" })];
    render(<ActivityTab />);
    expect(screen.getByText(/🎉/)).toBeInTheDocument();
  });

  it("renders savings threshold milestone", () => {
    mockState.milestones = [
      makeMilestone({
        id: "savings_threshold:50000",
        type: "savings_threshold",
        payload: { threshold: 50000, totalSaved: 55000 },
      }),
    ];
    render(<ActivityTab />);
    expect(screen.getByText("Saved $500!")).toBeInTheDocument();
  });

  it("shows no empty state when only milestones present", () => {
    mockState.milestones = [makeMilestone()];
    render(<ActivityTab />);
    expect(screen.queryByText(/No activity recorded yet/)).not.toBeInTheDocument();
  });

  it("interleaves milestones and bill changes by date (newest first)", () => {
    mockState.bills = [
      makeBill({
        id: "b1",
        name: "T-Mobile",
        cents: 12000,
        amountHistory: [{ date: "2026-04-10", cents: 10800 }],
      }),
    ];
    mockState.milestones = [
      makeMilestone({ achievedAt: "2026-04-01T12:00:00Z" }),
    ];
    render(<ActivityTab />);
    const rows = screen.getAllByRole("row").slice(1); // skip header
    // Bill change (Apr 10) should come before milestone (Apr 1)
    expect(rows[0]).toHaveTextContent("Apr 10, 2026");
    expect(rows[1]).toHaveTextContent("Apr 1, 2026");
  });
});
