import { render, screen, fireEvent } from "@testing-library/react";
import { DayDetail } from "./DayDetail";
import type { DayDetailData } from "./DayDetail";

const baseDay: DayDetailData = {
  name: "Wed",
  date: "Apr 15",
  payday: false,
  paycheck: 0,
  items: [],
  endBalance: 150000,
};

describe("DayDetail", () => {
  it("renders the day header and balance footer", () => {
    render(<DayDetail day={baseDay} onMarkPaid={jest.fn()} />);
    expect(screen.getByText("Wed · Apr 15")).toBeInTheDocument();
    expect(screen.getByText("Balance after this day")).toBeInTheDocument();
    expect(screen.getByText("$1,500.00")).toBeInTheDocument();
  });

  it("shows the quiet-day empty state when nothing is due", () => {
    render(<DayDetail day={baseDay} onMarkPaid={jest.fn()} />);
    expect(screen.getByText("No bills, no paycheck — a quiet day.")).toBeInTheDocument();
  });

  it("shows the paycheck row on a payday", () => {
    render(<DayDetail day={{ ...baseDay, payday: true, paycheck: 92400 }} onMarkPaid={jest.fn()} />);
    expect(screen.getByText("Paycheck lands")).toBeInTheDocument();
    expect(screen.getByText("+$924.00")).toBeInTheDocument();
  });

  it("renders a Mark paid button only on manual (pay) bills and fires onMarkPaid", () => {
    const onMarkPaid = jest.fn();
    render(
      <DayDetail
        day={{
          ...baseDay,
          items: [
            { id: "vz", name: "Verizon", kind: "pay", amt: 10800 },
            { id: "wt", name: "Water", kind: "auto", amt: 5000 },
          ],
        }}
        onMarkPaid={onMarkPaid}
      />,
    );
    expect(screen.getByText("Verizon")).toBeInTheDocument();
    expect(screen.getByText("Water")).toBeInTheDocument();
    const buttons = screen.getAllByRole("button", { name: "Mark paid" });
    expect(buttons).toHaveLength(1); // only the manual bill
    fireEvent.click(buttons[0]);
    expect(onMarkPaid).toHaveBeenCalledWith("vz");
  });
});
