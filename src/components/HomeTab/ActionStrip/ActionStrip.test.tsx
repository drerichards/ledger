import { render, screen, fireEvent } from "@testing-library/react";
import { ActionStrip } from "./ActionStrip";

describe("ActionStrip", () => {
  it("renders the next bill with a Mark paid button and fires onMarkPaid", () => {
    const onMarkPaid = jest.fn();
    render(
      <ActionStrip
        nextBill={{ id: "b1", name: "Jazmin", cents: 20000 }}
        nextPaycheck={{ whenLabel: "Thu · Apr 24", cents: 92400 }}
        overdue={{ count: 0, cents: 0 }}
        onMarkPaid={onMarkPaid}
      />,
    );
    expect(screen.getByText("Jazmin")).toBeInTheDocument();
    expect(screen.getByText("−$200.00")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mark paid" }));
    expect(onMarkPaid).toHaveBeenCalledWith("b1");
  });

  it("renders the next paycheck when label and amount", () => {
    render(
      <ActionStrip
        nextBill={null}
        nextPaycheck={{ whenLabel: "Thu · Apr 24", cents: 92400 }}
        overdue={{ count: 0, cents: 0 }}
        onMarkPaid={jest.fn()}
      />,
    );
    expect(screen.getByText("Thu · Apr 24")).toBeInTheDocument();
    expect(screen.getByText("+$924.00")).toBeInTheDocument();
  });

  it("shows the all-handled state when there is no next bill", () => {
    render(
      <ActionStrip
        nextBill={null}
        nextPaycheck={null}
        overdue={{ count: 0, cents: 0 }}
        onMarkPaid={jest.fn()}
      />,
    );
    expect(screen.getByText("All bills handled ✓")).toBeInTheDocument();
    expect(screen.getByText("Nothing overdue")).toBeInTheDocument();
  });

  it("shows the overdue count and total when bills are overdue", () => {
    render(
      <ActionStrip
        nextBill={null}
        nextPaycheck={null}
        overdue={{ count: 2, cents: 15000 }}
        onMarkPaid={jest.fn()}
      />,
    );
    expect(screen.getByText("2 bills overdue")).toBeInTheDocument();
    expect(screen.getByText("−$150.00")).toBeInTheDocument();
  });
});
