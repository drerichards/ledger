import { render, screen, fireEvent } from "@testing-library/react";
import { BillGroup } from "./BillGroup";
import type { Bill } from "@/types";
import type { SortKey, SortDir } from "./BillGroup";

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

function renderGroup(overrides: {
  bills?: Bill[];
  variant?: "navy" | "olive";
  footerLabel?: string;
  sortKey?: SortKey;
  sortDir?: SortDir;
  isCollapsed?: boolean;
  onToggle?: () => void;
  onSort?: (k: SortKey) => void;
  onEdit?: (b: Bill) => void;
  onDelete?: (id: string) => void;
  onTogglePaid?: (id: string) => void;
} = {}) {
  return render(
    <BillGroup
      label="From Kia's Pay"
      variant={overrides.variant ?? "navy"}
      footerLabel={overrides.footerLabel ?? "Subtotal"}
      bills={overrides.bills ?? []}
      sortKey={overrides.sortKey ?? "due"}
      sortDir={overrides.sortDir ?? "asc"}
      isCollapsed={overrides.isCollapsed ?? false}
      onToggle={overrides.onToggle ?? noop}
      onSort={overrides.onSort ?? noop}
      onEdit={overrides.onEdit ?? noop}
      onDelete={overrides.onDelete ?? noop}
      onTogglePaid={overrides.onTogglePaid ?? noop}
    />,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("BillGroup — rendering", () => {
  it("renders the group label", () => {
    renderGroup();
    expect(screen.getByText("From Kia's Pay")).toBeInTheDocument();
  });

  it("shows empty state message when bills array is empty", () => {
    renderGroup({ bills: [] });
    expect(screen.getByText(/No bills yet/)).toBeInTheDocument();
  });

  it("renders a row for each bill", () => {
    const bills = [
      makeBill({ id: "b1", name: "T-Mobile" }),
      makeBill({ id: "b2", name: "Progressive" }),
    ];
    renderGroup({ bills });
    expect(screen.getByText("T-Mobile")).toBeInTheDocument();
    expect(screen.getByText("Progressive")).toBeInTheDocument();
  });

  it("renders footer label when bills are present", () => {
    renderGroup({ bills: [makeBill({ cents: 10800 })] });
    expect(screen.getByText("Subtotal")).toBeInTheDocument();
    // $108.00 appears in both the BillRow cell and the group total footer
    expect(screen.getAllByText("$108.00").length).toBeGreaterThan(0);
  });

  it("does not render footer label when bills are empty", () => {
    renderGroup({ bills: [] });
    expect(screen.queryByText("Subtotal")).not.toBeInTheDocument();
  });
});

describe("BillGroup — collapse", () => {
  it("shows collapse icon '▼' when expanded", () => {
    renderGroup({ isCollapsed: false });
    expect(screen.getByText("▼")).toBeInTheDocument();
  });

  it("shows collapse icon '►' when collapsed", () => {
    renderGroup({ isCollapsed: true });
    expect(screen.getByText("►")).toBeInTheDocument();
  });

  it("calls onToggle when the group header is clicked", () => {
    const onToggle = jest.fn();
    renderGroup({ onToggle });
    fireEvent.click(screen.getByText("From Kia's Pay"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

describe("BillGroup — sorting", () => {
  it("calls onSort with the clicked column's sort key", () => {
    const onSort = jest.fn();
    renderGroup({ onSort });
    fireEvent.click(screen.getByText(/Payee/));
    expect(onSort).toHaveBeenCalledWith("name");
  });

  it("sorts bills by 'due' ascending by default", () => {
    const bills = [
      makeBill({ id: "b1", name: "Late Bill", due: 25 }),
      makeBill({ id: "b2", name: "Early Bill", due: 5 }),
    ];
    renderGroup({ bills, sortKey: "due", sortDir: "asc" });
    const rows = screen.getAllByRole("row");
    // Header row is first; first data row should be "Early Bill"
    expect(rows[1]).toHaveTextContent("Early Bill");
  });

  it("sorts bills by 'name' ascending", () => {
    const bills = [
      makeBill({ id: "b1", name: "Zzz Inc", due: 1 }),
      makeBill({ id: "b2", name: "Aaa Corp", due: 1 }),
    ];
    renderGroup({ bills, sortKey: "name", sortDir: "asc" });
    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Aaa Corp");
  });

  it("reverses sort when sortDir is 'desc'", () => {
    const bills = [
      makeBill({ id: "b1", name: "Zzz Inc", due: 1 }),
      makeBill({ id: "b2", name: "Aaa Corp", due: 1 }),
    ];
    renderGroup({ bills, sortKey: "name", sortDir: "desc" });
    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Zzz Inc");
  });

  it("sorts bills by 'cents' ascending (switch case line 30)", () => {
    const bills = [
      makeBill({ id: "b1", name: "Expensive", cents: 50000 }),
      makeBill({ id: "b2", name: "Cheap", cents: 1000 }),
    ];
    renderGroup({ bills, sortKey: "cents", sortDir: "asc" });
    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Cheap");
  });

  it("sorts bills by 'method' ascending (switch case line 31)", () => {
    const bills = [
      makeBill({ id: "b1", name: "Transfer Bill", method: "transfer" }),
      makeBill({ id: "b2", name: "Auto Bill", method: "autopay" }),
    ];
    renderGroup({ bills, sortKey: "method", sortDir: "asc" });
    const rows = screen.getAllByRole("row");
    // "autopay" < "transfer" alphabetically
    expect(rows[1]).toHaveTextContent("Auto Bill");
  });

  it("sorts bills by 'category' ascending (switch case line 32)", () => {
    const bills = [
      makeBill({ id: "b1", name: "Utilities Bill", category: "Utilities" }),
      makeBill({ id: "b2", name: "Credit Bill", category: "Credit Cards" }),
    ];
    renderGroup({ bills, sortKey: "category", sortDir: "asc" });
    const rows = screen.getAllByRole("row");
    // "Credit Cards" < "Utilities" alphabetically
    expect(rows[1]).toHaveTextContent("Credit Bill");
  });
});
