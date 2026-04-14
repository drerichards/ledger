import { render, screen, fireEvent } from "@testing-library/react";
import { BillRow } from "../BillRow";
import type { Bill } from "@/types";

// BillRow renders a <tr> — must be inside a valid table structure or
// the browser/jsdom will silently move it out of the tbody and break queries.
function renderRow(bill: Bill, overrides: Partial<{ onEdit: jest.Mock; onDelete: jest.Mock; onTogglePaid: jest.Mock }> = {}) {
  const onEdit = overrides.onEdit ?? jest.fn();
  const onDelete = overrides.onDelete ?? jest.fn();
  const onTogglePaid = overrides.onTogglePaid ?? jest.fn();

  render(
    <table>
      <tbody>
        <BillRow bill={bill} onEdit={onEdit} onDelete={onDelete} onTogglePaid={onTogglePaid} />
      </tbody>
    </table>
  );

  return { onEdit, onDelete, onTogglePaid };
}

function makeBill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: "bill-1",
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

describe("BillRow", () => {
  describe("rendering", () => {
    it("renders the bill name", () => {
      renderRow(makeBill({ name: "T-Mobile" }));
      expect(screen.getByText("T-Mobile")).toBeInTheDocument();
    });

    it("renders the formatted amount", () => {
      renderRow(makeBill({ cents: 108400 }));
      expect(screen.getByText("$1,084.00")).toBeInTheDocument();
    });

    it("renders the due day with ordinal suffix", () => {
      renderRow(makeBill({ due: 15 }));
      expect(screen.getByText("15th")).toBeInTheDocument();
    });

    it("renders '1st' for day 1", () => {
      renderRow(makeBill({ due: 1 }));
      expect(screen.getByText("1st")).toBeInTheDocument();
    });

    it("renders '11th' for day 11 (teen suffix edge case)", () => {
      renderRow(makeBill({ due: 11 }));
      expect(screen.getByText("11th")).toBeInTheDocument();
    });

    it("renders '21st' for day 21", () => {
      renderRow(makeBill({ due: 21 }));
      expect(screen.getByText("21st")).toBeInTheDocument();
    });

    it("renders recurring badge (↻) when entry is recurring", () => {
      renderRow(makeBill({ entry: "recurring" }));
      expect(screen.getByText("↻")).toBeInTheDocument();
    });

    it("does not render recurring badge for manual bills", () => {
      renderRow(makeBill({ entry: "manual" }));
      expect(screen.queryByText("↻")).not.toBeInTheDocument();
    });

    it("renders flag badge (!) when flagged", () => {
      renderRow(makeBill({ flagged: true }));
      expect(screen.getByText("!")).toBeInTheDocument();
    });

    it("does not render flag badge when not flagged", () => {
      renderRow(makeBill({ flagged: false }));
      expect(screen.queryByText("!")).not.toBeInTheDocument();
    });

    it("preserves notes as row title tooltip", () => {
      renderRow(makeBill({ notes: "Keep at 32.00" }));
      // notes are a title tooltip on the <tr>, not visible text
      expect(screen.getByRole("row")).toHaveAttribute("title", "Keep at 32.00");
    });
  });

  describe("method badge", () => {
    it("renders 'Transfer' for kias_pay non-credit bills", () => {
      renderRow(makeBill({ group: "kias_pay", category: "Utilities" }));
      expect(screen.getByText("Transfer")).toBeInTheDocument();
    });

    it("renders 'Affirm' for other_income bills", () => {
      renderRow(makeBill({ group: "other_income", category: "Loans" }));
      expect(screen.getByText("Affirm")).toBeInTheDocument();
    });

    it("renders 'Credit' for Credit Cards category", () => {
      renderRow(makeBill({ group: "kias_pay", category: "Credit Cards" }));
      expect(screen.getByText("Credit")).toBeInTheDocument();
    });
  });

  describe("status pill", () => {
    it("renders 'Unpaid' button when bill is unpaid", () => {
      renderRow(makeBill({ paid: false }));
      expect(screen.getByText("Unpaid")).toBeInTheDocument();
    });

    it("renders '✓ Paid' button when bill is paid", () => {
      renderRow(makeBill({ paid: true }));
      expect(screen.getByText("✓ Paid")).toBeInTheDocument();
    });

    it("has aria-pressed=false when unpaid", () => {
      renderRow(makeBill({ paid: false }));
      const btn = screen.getByRole("button", { name: /mark t-mobile as paid/i });
      expect(btn).toHaveAttribute("aria-pressed", "false");
    });

    it("has aria-pressed=true when paid", () => {
      renderRow(makeBill({ paid: true }));
      const btn = screen.getByRole("button", { name: /mark t-mobile as unpaid/i });
      expect(btn).toHaveAttribute("aria-pressed", "true");
    });

    it("calls onTogglePaid with bill id when status button is clicked", () => {
      const onTogglePaid = jest.fn();
      renderRow(makeBill({ id: "bill-abc", paid: false }), { onTogglePaid });
      fireEvent.click(screen.getByText("Unpaid"));
      expect(onTogglePaid).toHaveBeenCalledTimes(1);
      expect(onTogglePaid).toHaveBeenCalledWith("bill-abc");
    });
  });

  describe("actions", () => {
    it("calls onEdit with the full bill when Edit is clicked", () => {
      const onEdit = jest.fn();
      const bill = makeBill({ id: "bill-edit-test", name: "Netflix" });
      renderRow(bill, { onEdit });
      fireEvent.click(screen.getByRole("button", { name: /actions for netflix/i }));
      fireEvent.click(screen.getByRole("menuitem", { name: /edit netflix/i }));
      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledWith(bill);
    });

    it("calls onDelete with bill id when Delete is clicked", () => {
      const onDelete = jest.fn();
      renderRow(makeBill({ id: "bill-del-test", name: "Netflix" }), { onDelete });
      fireEvent.click(screen.getByRole("button", { name: /actions for netflix/i }));
      fireEvent.click(screen.getByRole("menuitem", { name: /delete netflix/i }));
      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith("bill-del-test");
    });

    it("menu closes after Edit is clicked", () => {
      const bill = makeBill({ name: "Netflix" });
      renderRow(bill);
      fireEvent.click(screen.getByRole("button", { name: /actions for netflix/i }));
      expect(screen.getByRole("menu")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("menuitem", { name: /edit netflix/i }));
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });
});
