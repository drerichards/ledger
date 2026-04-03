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

    it("renders 'A' badge for autopay", () => {
      renderRow(makeBill({ method: "autopay" }));
      expect(screen.getByText("A")).toBeInTheDocument();
    });

    it("renders 'TRF' badge for transfer", () => {
      renderRow(makeBill({ method: "transfer" }));
      expect(screen.getByText("TRF")).toBeInTheDocument();
    });

    it("renders the due day", () => {
      renderRow(makeBill({ due: 15 }));
      expect(screen.getByText("15")).toBeInTheDocument();
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

    it("renders notes when provided", () => {
      renderRow(makeBill({ notes: "Keep at 32.00" }));
      expect(screen.getByText("Keep at 32.00")).toBeInTheDocument();
    });
  });

  describe("checkbox", () => {
    it("renders unchecked when bill is unpaid", () => {
      renderRow(makeBill({ paid: false }));
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).not.toBeChecked();
    });

    it("renders checked when bill is paid", () => {
      renderRow(makeBill({ paid: true }));
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toBeChecked();
    });

    it("calls onTogglePaid with bill id when checkbox changes", () => {
      const onTogglePaid = jest.fn();
      renderRow(makeBill({ id: "bill-abc" }), { onTogglePaid });
      fireEvent.click(screen.getByRole("checkbox"));
      expect(onTogglePaid).toHaveBeenCalledTimes(1);
      expect(onTogglePaid).toHaveBeenCalledWith("bill-abc");
    });
  });

  describe("actions", () => {
    it("calls onEdit with the full bill when Edit is clicked", () => {
      const onEdit = jest.fn();
      const bill = makeBill({ id: "bill-edit-test", name: "Netflix" });
      renderRow(bill, { onEdit });
      fireEvent.click(screen.getByRole("button", { name: /edit netflix/i }));
      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledWith(bill);
    });

    it("calls onDelete with bill id when Del is clicked", () => {
      const onDelete = jest.fn();
      renderRow(makeBill({ id: "bill-del-test", name: "Netflix" }), { onDelete });
      fireEvent.click(screen.getByRole("button", { name: /delete netflix/i }));
      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith("bill-del-test");
    });
  });
});
