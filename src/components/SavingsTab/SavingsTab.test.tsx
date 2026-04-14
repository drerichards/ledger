import { render, screen } from "@testing-library/react";
import { SavingsTab } from "@/components/SavingsTab/SavingsTab";

jest.mock("@/lib/dates", () => ({
  ...jest.requireActual("@/lib/dates"),
  currentMonth: jest.fn(() => "2026-04"),
  getMondaysUpToMonth: jest.fn(() => ["2026-04-06", "2026-04-13"]),
  mondayOf: jest.fn((d: string) => d),
  today: jest.fn(() => "2026-04-06"),
}));

jest.mock("@/lib/affirm", () => ({
  getAffirmTotalForMonth: jest.fn(() => 0),
}));

describe("SavingsTab", () => {
  it("renders the tab navigation", () => {
    render(
      <SavingsTab
        plans={[]}
        checking={[]}
        savingsLog={[]}
        paycheck={[]}
        goals={[]}
        onAddSavings={() => {}}
        onUpdateSavings={() => {}}
        onDeleteSavings={() => {}}
        onAddGoal={() => {}}
        onDeleteGoal={() => {}}
      />,
    );
    expect(screen.getByRole("tab", { name: "Goals" })).toBeInTheDocument();
  });

  it("renders the SavingsTracker panel heading", () => {
    render(
      <SavingsTab
        plans={[]}
        checking={[]}
        savingsLog={[]}
        paycheck={[]}
        goals={[]}
        onAddSavings={() => {}}
        onUpdateSavings={() => {}}
        onDeleteSavings={() => {}}
        onAddGoal={() => {}}
        onDeleteGoal={() => {}}
      />,
    );
    expect(screen.getByText("Savings Balance")).toBeInTheDocument();
  });

});
