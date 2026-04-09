import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { GoalSetter } from "./GoalSetter";
import type { SavingsGoal, SavingsEntry } from "@/types";

jest.mock("@/lib/dates", () => ({
  ...jest.requireActual("@/lib/dates"),
  currentMonth: jest.fn(() => "2026-04"),
  today: jest.fn(() => "2026-04-09"),
}));

jest.mock("@/lib/id", () => ({
  generateId: jest.fn(() => "test-id-1"),
}));

const SAVINGS_LOG: SavingsEntry[] = [
  { id: "s1", date: "2026-03-01", amount: 50000 }, // $500
];

const GOAL_ON_TRACK: SavingsGoal = {
  id: "g1",
  label: "Emergency Fund",
  targetCents: 100000,
  targetDate: "2026-12",
  createdAt: "2026-01-01T00:00:00.000Z",
};

const GOAL_ACHIEVED: SavingsGoal = {
  id: "g2",
  label: "Starter savings",
  targetCents: 20000,
  targetDate: "2026-06",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("GoalSetter", () => {
  it("renders the section heading", () => {
    render(
      <GoalSetter
        goals={[]}
        savingsLog={SAVINGS_LOG}
        onAdd={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByText("Savings Goals")).toBeInTheDocument();
  });

  it("shows current savings balance", () => {
    render(
      <GoalSetter
        goals={[]}
        savingsLog={SAVINGS_LOG}
        onAdd={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByText(/Current balance/)).toBeInTheDocument();
    expect(screen.getByText("$500.00")).toBeInTheDocument();
  });

  it("shows empty state when no goals", () => {
    render(
      <GoalSetter
        goals={[]}
        savingsLog={[]}
        onAdd={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(
      screen.getByText(/No goals set yet/),
    ).toBeInTheDocument();
  });

  it("renders Add Goal button", () => {
    render(
      <GoalSetter
        goals={[]}
        savingsLog={[]}
        onAdd={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "+ Add Goal" })).toBeInTheDocument();
  });

  it("shows form when Add Goal is clicked", () => {
    render(
      <GoalSetter
        goals={[]}
        savingsLog={[]}
        onAdd={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "+ Add Goal" }));
    expect(screen.getByLabelText("Goal name")).toBeInTheDocument();
    expect(screen.getByLabelText("Target amount ($)")).toBeInTheDocument();
    expect(screen.getByLabelText("Target month")).toBeInTheDocument();
  });

  it("hides form when Cancel is clicked", () => {
    render(
      <GoalSetter
        goals={[]}
        savingsLog={[]}
        onAdd={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "+ Add Goal" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByLabelText("Goal name")).not.toBeInTheDocument();
  });

  it("calls onAdd with correct data when form is submitted", () => {
    const onAdd = jest.fn();
    render(
      <GoalSetter
        goals={[]}
        savingsLog={[]}
        onAdd={onAdd}
        onDelete={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "+ Add Goal" }));
    fireEvent.change(screen.getByLabelText("Goal name"), {
      target: { value: "New Car" },
    });
    fireEvent.change(screen.getByLabelText("Target amount ($)"), {
      target: { value: "1000" },
    });
    fireEvent.change(screen.getByLabelText("Target month"), {
      target: { value: "2026-12" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Goal" }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "test-id-1",
        label: "New Car",
        targetCents: 100000,
        targetDate: "2026-12",
      }),
    );
  });

  it("does not call onAdd if label is empty", () => {
    const onAdd = jest.fn();
    render(
      <GoalSetter
        goals={[]}
        savingsLog={[]}
        onAdd={onAdd}
        onDelete={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "+ Add Goal" }));
    fireEvent.change(screen.getByLabelText("Target amount ($)"), {
      target: { value: "1000" },
    });
    fireEvent.change(screen.getByLabelText("Target month"), {
      target: { value: "2026-12" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Goal" }));
    expect(onAdd).not.toHaveBeenCalled();
  });

  it("renders goal card with label", () => {
    render(
      <GoalSetter
        goals={[GOAL_ON_TRACK]}
        savingsLog={SAVINGS_LOG}
        onAdd={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByText("Emergency Fund")).toBeInTheDocument();
  });

  it("renders achieved badge when goal is met", () => {
    render(
      <GoalSetter
        goals={[GOAL_ACHIEVED]}
        savingsLog={SAVINGS_LOG}
        onAdd={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByText("Achieved")).toBeInTheDocument();
  });

  it("renders delete button for each goal", () => {
    render(
      <GoalSetter
        goals={[GOAL_ON_TRACK]}
        savingsLog={SAVINGS_LOG}
        onAdd={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Delete goal: Emergency Fund" }),
    ).toBeInTheDocument();
  });

  it("calls onDelete when delete button is clicked", () => {
    const onDelete = jest.fn();
    render(
      <GoalSetter
        goals={[GOAL_ON_TRACK]}
        savingsLog={SAVINGS_LOG}
        onAdd={jest.fn()}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Delete goal: Emergency Fund" }),
    );
    expect(onDelete).toHaveBeenCalledWith("g1");
  });

  it("renders target info in goal card", () => {
    render(
      <GoalSetter
        goals={[GOAL_ON_TRACK]}
        savingsLog={SAVINGS_LOG}
        onAdd={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(screen.getByText(/\$1,000\.00 by December 2026/)).toBeInTheDocument();
  });

  it("renders progress ring inside goal card", () => {
    const { container } = render(
      <GoalSetter
        goals={[GOAL_ON_TRACK]}
        savingsLog={SAVINGS_LOG}
        onAdd={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("hides Add Goal button while form is open", () => {
    render(
      <GoalSetter
        goals={[]}
        savingsLog={[]}
        onAdd={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "+ Add Goal" }));
    expect(
      screen.queryByRole("button", { name: "+ Add Goal" }),
    ).not.toBeInTheDocument();
  });
});
