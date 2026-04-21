import { render, screen, fireEvent } from "@testing-library/react";
import { AffirmTab } from "@/components/AffirmTab/AffirmTab";
import type { InstallmentPlan } from "@/types";

jest.mock("@/lib/dates", () => ({
  ...jest.requireActual("@/lib/dates"),
  currentMonth: jest.fn(() => "2026-04"),
}));

function makePlan(overrides: Partial<InstallmentPlan> = {}): InstallmentPlan {
  return {
    id: "plan-1",
    label: "Amazon Card",
    mc: 5000,
    start: "2026-01",
    end: "2026-06",
    dueDay: 26,
    ...overrides,
  };
}

const noop = () => {};

describe("AffirmTab — empty state", () => {
  it("shows empty state message when no plans exist", () => {
    render(<AffirmTab plans={[]} onAdd={noop} onDelete={noop} />);
    expect(screen.getByText(/No installment plans yet/)).toBeInTheDocument();
    expect(screen.getByText("Payoff")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Plans" })).toBeInTheDocument();
  });

  it("renders the FAB add button", () => {
    render(<AffirmTab plans={[]} onAdd={noop} onDelete={noop} />);
    expect(screen.getByRole("button", { name: /Add Plan/i })).toBeInTheDocument();
  });
});

describe("AffirmTab — with plans", () => {
  it("renders the plan grid when plans exist", () => {
    const plans = [makePlan()];
    render(<AffirmTab plans={plans} onAdd={noop} onDelete={noop} />);
    expect(screen.getByText("Amazon Card")).toBeInTheDocument();
  });

  it("renders a column header for each month in the grid", () => {
    const plans = [makePlan({ start: "2026-04", end: "2026-04" })];
    render(<AffirmTab plans={plans} onAdd={noop} onDelete={noop} />);
    expect(screen.getAllByText(/Apr.+26/).length).toBeGreaterThan(0);
  });

  it("renders the Monthly Total row in tfoot", () => {
    const plans = [makePlan()];
    render(<AffirmTab plans={plans} onAdd={noop} onDelete={noop} />);
    expect(screen.getByText("Monthly Total")).toBeInTheDocument();
  });

  it("does not show empty state message when plans exist", () => {
    render(<AffirmTab plans={[makePlan()]} onAdd={noop} onDelete={noop} />);
    expect(screen.queryByText(/No installment plans yet/)).not.toBeInTheDocument();
  });
});

describe("AffirmTab — Add Plan modal", () => {
  it("opens the dialog when FAB is clicked", () => {
    render(<AffirmTab plans={[]} onAdd={noop} onDelete={noop} />);
    fireEvent.click(screen.getByRole("button", { name: /Add Plan/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("calls onAdd and closes dialog when form is saved", () => {
    const onAdd = jest.fn();
    render(<AffirmTab plans={[]} onAdd={onAdd} onDelete={noop} />);
    fireEvent.click(screen.getByRole("button", { name: /Add Plan/i }));

    fireEvent.change(screen.getByLabelText("Plan Label"), { target: { value: "Amazon" } });
    fireEvent.change(screen.getByLabelText("Monthly Payment ($)"), { target: { value: "50.00" } });
    // start is pre-filled with currentMonth() = "2026-04"
    fireEvent.change(screen.getByLabelText("Final Payment Month"), { target: { value: "2026-06" } });
    fireEvent.click(screen.getByText("Save Plan"));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes dialog when Cancel is clicked inside AffirmForm", () => {
    render(<AffirmTab plans={[]} onAdd={noop} onDelete={noop} />);
    fireEvent.click(screen.getByRole("button", { name: /Add Plan/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onUpdate when editing an existing plan", () => {
    const onUpdate = jest.fn();
    render(
      <AffirmTab
        plans={[makePlan()]}
        onAdd={noop}
        onUpdate={onUpdate}
        onDelete={noop}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /edit amazon card/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Monthly Payment ($)"), {
      target: { value: "75.00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "plan-1",
        label: "Amazon Card",
        mc: 7500,
        dueDay: 26,
      }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
