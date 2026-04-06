import { render, screen, fireEvent } from "@testing-library/react";
import { SavingsTab } from "@/components/SavingsTab/SavingsTab";

jest.mock("@/lib/dates", () => ({
  ...jest.requireActual("@/lib/dates"),
  currentMonth: jest.fn(() => "2026-04"),
  getMondaysUpToMonth: jest.fn(() => ["2026-04-06", "2026-04-13"]),
  mondayOf: jest.fn((d: string) => d),
  today: jest.fn(() => "2026-04-06"),
}));

describe("SavingsTab", () => {
  it("renders the Savings & Projections heading", () => {
    render(
      <SavingsTab
        plans={[]}
        checking={[]}
        savingsLog={[]}
        paycheck={[]}
        onAddSavings={() => {}}
        onUpdateSavings={() => {}}
        onDeleteSavings={() => {}}
      />,
    );
    expect(screen.getByText("Savings & Projections")).toBeInTheDocument();
  });

  it("renders the SavingsTracker panel heading", () => {
    render(
      <SavingsTab
        plans={[]}
        checking={[]}
        savingsLog={[]}
        paycheck={[]}
        onAddSavings={() => {}}
        onUpdateSavings={() => {}}
        onDeleteSavings={() => {}}
      />,
    );
    expect(screen.getByText("Savings Balance")).toBeInTheDocument();
  });

  it("renders the 'Paycheck tab' link when onGoToPaycheck is provided", () => {
    render(
      <SavingsTab
        plans={[]}
        checking={[]}
        savingsLog={[]}
        paycheck={[]}
        onAddSavings={() => {}}
        onUpdateSavings={() => {}}
        onDeleteSavings={() => {}}
        onGoToPaycheck={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Paycheck tab" })).toBeInTheDocument();
  });

  it("calls onGoToPaycheck when 'Paycheck tab' button is clicked", () => {
    const onGoToPaycheck = jest.fn();
    render(
      <SavingsTab
        plans={[]}
        checking={[]}
        savingsLog={[]}
        paycheck={[]}
        onAddSavings={() => {}}
        onUpdateSavings={() => {}}
        onDeleteSavings={() => {}}
        onGoToPaycheck={onGoToPaycheck}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Paycheck tab" }));
    expect(onGoToPaycheck).toHaveBeenCalledTimes(1);
  });

  it("does not render 'Paycheck tab' link when onGoToPaycheck is not provided", () => {
    render(
      <SavingsTab
        plans={[]}
        checking={[]}
        savingsLog={[]}
        paycheck={[]}
        onAddSavings={() => {}}
        onUpdateSavings={() => {}}
        onDeleteSavings={() => {}}
      />,
    );
    expect(screen.queryByRole("button", { name: "Paycheck tab" })).not.toBeInTheDocument();
  });
});
