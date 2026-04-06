import { render, screen, fireEvent } from "@testing-library/react";
import { AffirmForm } from "./AffirmForm";

jest.mock("@/lib/dates", () => ({
  ...jest.requireActual("@/lib/dates"),
  currentMonth: jest.fn(() => "2026-04"),
}));

jest.mock("@/lib/id", () => ({ generateId: jest.fn(() => "test-plan-id") }));

const noop = () => {};

describe("AffirmForm — rendering", () => {
  it("renders the Add Installment Plan title", () => {
    render(<AffirmForm onSave={noop} onClose={noop} />);
    expect(screen.getByText("Add Installment Plan")).toBeInTheDocument();
  });

  it("renders label, amount, start, and end fields", () => {
    render(<AffirmForm onSave={noop} onClose={noop} />);
    expect(screen.getByLabelText("Plan Label")).toBeInTheDocument();
    expect(screen.getByLabelText("Monthly Payment ($)")).toBeInTheDocument();
    expect(screen.getByLabelText("Start Month")).toBeInTheDocument();
    expect(screen.getByLabelText("Final Payment Month")).toBeInTheDocument();
  });

  it("pre-fills start month with current month", () => {
    render(<AffirmForm onSave={noop} onClose={noop} />);
    expect(screen.getByLabelText("Start Month")).toHaveValue("2026-04");
  });

  it("updates start month when the field is changed (line 111 onChange)", () => {
    render(<AffirmForm onSave={noop} onClose={noop} />);
    fireEvent.change(screen.getByLabelText("Start Month"), {
      target: { value: "2026-06" },
    });
    expect(screen.getByLabelText("Start Month")).toHaveValue("2026-06");
  });
});

describe("AffirmForm — validation", () => {
  it("shows error when label is missing on save", () => {
    render(<AffirmForm onSave={noop} onClose={noop} />);
    fireEvent.click(screen.getByRole("button", { name: "Save Plan" }));
    expect(screen.getByText("Label is required")).toBeInTheDocument();
  });

  it("shows error when amount is missing on save", () => {
    render(<AffirmForm onSave={noop} onClose={noop} />);
    fireEvent.change(screen.getByLabelText("Plan Label"), {
      target: { value: "Amazon Card" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Plan" }));
    expect(screen.getByText("Amount is required")).toBeInTheDocument();
  });

  it("shows error when end month is before start month", () => {
    render(<AffirmForm onSave={noop} onClose={noop} />);
    fireEvent.change(screen.getByLabelText("Plan Label"), { target: { value: "Plan" } });
    fireEvent.change(screen.getByLabelText("Monthly Payment ($)"), { target: { value: "50" } });
    fireEvent.change(screen.getByLabelText("Final Payment Month"), { target: { value: "2025-12" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Plan" }));
    expect(screen.getByText("Final month must be after start month")).toBeInTheDocument();
  });
});

describe("AffirmForm — save", () => {
  it("calls onSave with correct plan data when valid", () => {
    const onSave = jest.fn();
    render(<AffirmForm onSave={onSave} onClose={noop} />);
    fireEvent.change(screen.getByLabelText("Plan Label"), { target: { value: "Amazon Card" } });
    fireEvent.change(screen.getByLabelText("Monthly Payment ($)"), { target: { value: "50" } });
    fireEvent.change(screen.getByLabelText("Final Payment Month"), { target: { value: "2026-06" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Plan" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "test-plan-id",
        label: "Amazon Card",
        mc: 5000,
        start: "2026-04",
        end: "2026-06",
      }),
    );
  });

  it("calls onClose when Cancel is clicked", () => {
    const onClose = jest.fn();
    render(<AffirmForm onSave={noop} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("AffirmForm — preview", () => {
  it("shows payment preview when both start and end are set", () => {
    render(<AffirmForm onSave={noop} onClose={noop} />);
    fireEvent.change(screen.getByLabelText("Monthly Payment ($)"), { target: { value: "50" } });
    fireEvent.change(screen.getByLabelText("Final Payment Month"), { target: { value: "2026-06" } });
    // 3 months (Apr, May, Jun) × $50 = $150
    expect(screen.getByText(/3 months/)).toBeInTheDocument();
    expect(screen.getByText(/\$150\.00/)).toBeInTheDocument();
  });
});
