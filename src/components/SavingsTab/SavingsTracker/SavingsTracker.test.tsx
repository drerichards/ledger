import { render, screen, fireEvent } from "@testing-library/react";
import { SavingsTracker } from "./SavingsTracker";
import type { SavingsEntry } from "@/types";

// ─── Mock id generation so tests are deterministic ────────────────────────────

jest.mock("@/lib/id", () => ({ generateId: jest.fn(() => "test-id") }));
jest.mock("@/lib/dates", () => ({
  ...jest.requireActual("@/lib/dates"),
  today: jest.fn(() => "2026-04-06"),
}));

// ─── Factory ──────────────────────────────────────────────────────────────────

function makeEntry(overrides: Partial<SavingsEntry> = {}): SavingsEntry {
  return { id: "s1", date: "2026-04-06", amount: 5000, ...overrides };
}

const noop = () => {};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SavingsTracker — rendering", () => {
  it("renders the panel heading", () => {
    render(<SavingsTracker log={[]} onAdd={noop} onUpdate={noop} onDelete={noop} />);
    expect(screen.getByText("Savings Balance")).toBeInTheDocument();
  });

  it("shows $0.00 balance when log is empty", () => {
    render(<SavingsTracker log={[]} onAdd={noop} onUpdate={noop} onDelete={noop} />);
    expect(screen.getByText("$0.00")).toBeInTheDocument();
  });

  it("shows running total from the log", () => {
    const log = [makeEntry({ amount: 10000 }), makeEntry({ id: "s2", amount: 5000 })];
    render(<SavingsTracker log={log} onAdd={noop} onUpdate={noop} onDelete={noop} />);
    expect(screen.getByText("$150.00")).toBeInTheDocument();
  });

  it("renders each log entry's amount", () => {
    render(
      <SavingsTracker
        log={[makeEntry({ amount: 7500 })]}
        onAdd={noop}
        onUpdate={noop}
        onDelete={noop}
      />,
    );
    // Log entry renders "+" prefix: "+ $75.00" — running total renders "$75.00" (no prefix)
    expect(screen.getByText(/\+ \$75\.00/)).toBeInTheDocument();
  });
});

describe("SavingsTracker — add entry", () => {
  it("calls onAdd with a new entry when + Save is clicked with a valid amount", () => {
    const onAdd = jest.fn();
    render(<SavingsTracker log={[]} onAdd={onAdd} onUpdate={noop} onDelete={noop} />);
    const amountInput = screen.getByPlaceholderText("Amount");
    fireEvent.change(amountInput, { target: { value: "50.00" } });
    fireEvent.click(screen.getByText("+ Save"));
    expect(onAdd).toHaveBeenCalledWith({ id: "test-id", date: "2026-04-06", amount: 5000 });
  });

  it("does not call onAdd when amount is zero", () => {
    const onAdd = jest.fn();
    render(<SavingsTracker log={[]} onAdd={onAdd} onUpdate={noop} onDelete={noop} />);
    fireEvent.click(screen.getByText("+ Save"));
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("adds on Enter key in the amount input", () => {
    const onAdd = jest.fn();
    render(<SavingsTracker log={[]} onAdd={onAdd} onUpdate={noop} onDelete={noop} />);
    const input = screen.getByPlaceholderText("Amount");
    fireEvent.change(input, { target: { value: "25" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});

describe("SavingsTracker — delete entry", () => {
  it("calls onDelete when × is clicked", () => {
    const onDelete = jest.fn();
    render(
      <SavingsTracker
        log={[makeEntry()]}
        onAdd={noop}
        onUpdate={noop}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByTitle("Delete"));
    expect(onDelete).toHaveBeenCalledWith("s1");
  });

  // NOTE: line 60 (cancelEdit inside handleDelete when editingId === id) is not
  // reachable through UI interaction — the Delete button is hidden when a row is
  // in edit mode. This is a defensive guard for external/programmatic deletion.
  // Istanbul will continue to flag it; that is acceptable and documented here.
});

describe("SavingsTracker — edit entry", () => {
  it("shows edit inputs when ✎ is clicked", () => {
    render(
      <SavingsTracker
        log={[makeEntry({ amount: 5000 })]}
        onAdd={noop}
        onUpdate={noop}
        onDelete={noop}
      />,
    );
    fireEvent.click(screen.getByTitle("Edit"));
    // Edit inputs appear
    expect(screen.getByDisplayValue("50.00")).toBeInTheDocument();
  });

  it("calls onUpdate with updated entry when ✓ is clicked", () => {
    const onUpdate = jest.fn();
    render(
      <SavingsTracker
        log={[makeEntry({ id: "s1", amount: 5000 })]}
        onAdd={noop}
        onUpdate={onUpdate}
        onDelete={noop}
      />,
    );
    fireEvent.click(screen.getByTitle("Edit"));
    const editInput = screen.getByDisplayValue("50.00");
    fireEvent.change(editInput, { target: { value: "100.00" } });
    fireEvent.click(screen.getByTitle("Save"));
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "s1", amount: 10000 }),
    );
  });

  it("cancels edit when ✕ is clicked", () => {
    const onUpdate = jest.fn();
    render(
      <SavingsTracker
        log={[makeEntry()]}
        onAdd={noop}
        onUpdate={onUpdate}
        onDelete={noop}
      />,
    );
    fireEvent.click(screen.getByTitle("Edit"));
    fireEvent.click(screen.getByTitle("Cancel"));
    expect(onUpdate).not.toHaveBeenCalled();
    // Back to normal view — delete button visible again
    expect(screen.getByTitle("Delete")).toBeInTheDocument();
  });

  it("commits edit on Enter key in the edit input", () => {
    const onUpdate = jest.fn();
    render(
      <SavingsTracker
        log={[makeEntry({ id: "s1", amount: 5000 })]}
        onAdd={noop}
        onUpdate={onUpdate}
        onDelete={noop}
      />,
    );
    fireEvent.click(screen.getByTitle("Edit"));
    const editInput = screen.getByDisplayValue("50.00");
    fireEvent.change(editInput, { target: { value: "75.00" } });
    fireEvent.keyDown(editInput, { key: "Enter" });
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it("cancels edit on Escape key in the edit input", () => {
    const onUpdate = jest.fn();
    render(
      <SavingsTracker
        log={[makeEntry()]}
        onAdd={noop}
        onUpdate={onUpdate}
        onDelete={noop}
      />,
    );
    fireEvent.click(screen.getByTitle("Edit"));
    const editInput = screen.getByDisplayValue("50.00");
    fireEvent.keyDown(editInput, { key: "Escape" });
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("cancels edit (without calling onUpdate) when committed with zero amount", () => {
    const onUpdate = jest.fn();
    render(
      <SavingsTracker
        log={[makeEntry({ id: "s1", amount: 5000 })]}
        onAdd={noop}
        onUpdate={onUpdate}
        onDelete={noop}
      />,
    );
    fireEvent.click(screen.getByTitle("Edit"));
    const editInput = screen.getByDisplayValue("50.00");
    fireEvent.change(editInput, { target: { value: "0" } });
    fireEvent.click(screen.getByTitle("Save"));
    // cents <= 0 → cancelEdit() → onUpdate never called
    expect(onUpdate).not.toHaveBeenCalled();
    // Edit mode exited — Delete button visible again
    expect(screen.getByTitle("Delete")).toBeInTheDocument();
  });

  it("updates the edit date input when changed", () => {
    render(
      <SavingsTracker
        log={[makeEntry({ id: "s1", date: "2026-04-06", amount: 5000 })]}
        onAdd={noop}
        onUpdate={noop}
        onDelete={noop}
      />,
    );
    fireEvent.click(screen.getByTitle("Edit"));
    // Both add-form and edit-form date inputs share the same initial value.
    // Add-form input is [0] (rendered first); edit-form input is [1].
    const dateInput = screen.getAllByDisplayValue("2026-04-06")[1];
    fireEvent.change(dateInput, { target: { value: "2026-04-13" } });
    expect(dateInput).toHaveValue("2026-04-13");
  });

  it("updates the date input in the add form when changed", () => {
    // Render with empty log — only the add form's date input is present
    render(<SavingsTracker log={[]} onAdd={noop} onUpdate={noop} onDelete={noop} />);
    // The add form's date input starts with today's date: "2026-04-06"
    const addDateInput = screen.getByDisplayValue("2026-04-06");
    fireEvent.change(addDateInput, { target: { value: "2026-04-13" } });
    expect(addDateInput).toHaveValue("2026-04-13");
  });
});
