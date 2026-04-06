import { render, screen, fireEvent } from "@testing-library/react";
import { PlanRow } from "./PlanRow";
import type { InstallmentPlan } from "@/types";

function makePlan(overrides: Partial<InstallmentPlan> = {}): InstallmentPlan {
  return {
    id: "plan-1",
    label: "Amazon Card",
    mc: 5000,
    start: "2026-01",
    end: "2026-06",
    ...overrides,
  };
}

function renderRow(
  plan = makePlan(),
  months = ["2026-04", "2026-05", "2026-06"],
  totalOwed = 15000,
  onDelete = jest.fn(),
) {
  return render(
    <table><tbody>
      <PlanRow plan={plan} months={months} totalOwed={totalOwed} onDelete={onDelete} />
    </tbody></table>,
  );
}

describe("PlanRow — rendering", () => {
  it("renders the plan label", () => {
    renderRow();
    expect(screen.getByText("Amazon Card")).toBeInTheDocument();
  });

  it("renders the monthly payment rate", () => {
    renderRow();
    expect(screen.getByText("$50.00/mo")).toBeInTheDocument();
  });

  it("renders the total owed", () => {
    renderRow(makePlan(), ["2026-04", "2026-05", "2026-06"], 15000);
    expect(screen.getByText("$150.00")).toBeInTheDocument();
  });

  it("renders an inactive cell for months outside the plan range", () => {
    const plan = makePlan({ start: "2026-05", end: "2026-06" });
    const { container } = renderRow(plan, ["2026-04", "2026-05", "2026-06"]);
    // 2026-04 is before start — should be inactive (no amount)
    const inactiveCells = container.querySelectorAll("[class*=tdInactive]");
    expect(inactiveCells.length).toBeGreaterThan(0);
  });

  it("renders FINAL badge on the last payment month", () => {
    const plan = makePlan({ start: "2026-04", end: "2026-04" });
    renderRow(plan, ["2026-04"]);
    expect(screen.getByText("FINAL")).toBeInTheDocument();
  });

  it("does not render FINAL badge for non-final months", () => {
    const plan = makePlan({ start: "2026-04", end: "2026-06" });
    renderRow(plan, ["2026-04"]);
    expect(screen.queryByText("FINAL")).not.toBeInTheDocument();
  });
});

describe("PlanRow — delete flow", () => {
  it("shows delete icon button by default", () => {
    renderRow();
    expect(screen.getByLabelText("Delete Amazon Card")).toBeInTheDocument();
  });

  it("shows confirm/cancel buttons after clicking delete", () => {
    renderRow();
    fireEvent.click(screen.getByLabelText("Delete Amazon Card"));
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("calls onDelete with the plan id when delete is confirmed", () => {
    const onDelete = jest.fn();
    renderRow(makePlan(), ["2026-04"], 5000, onDelete);
    fireEvent.click(screen.getByLabelText("Delete Amazon Card"));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith("plan-1");
  });

  it("cancels delete and restores the delete icon button", () => {
    const onDelete = jest.fn();
    renderRow(makePlan(), ["2026-04"], 5000, onDelete);
    fireEvent.click(screen.getByLabelText("Delete Amazon Card"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Delete Amazon Card")).toBeInTheDocument();
  });
});
