import { render, screen } from "@testing-library/react";
import { PayoffMilestone } from "@/components/AffirmTab/PayoffMilestone";
import type { InstallmentPlan } from "@/types";

const plan: InstallmentPlan = {
  id: "plan-1",
  label: "Amazon Card",
  mc: 5000, // $50.00
  start: "2026-01",
  end: "2026-06",
};

describe("PayoffMilestone", () => {
  it("renders the plan label", () => {
    render(<PayoffMilestone plan={plan} />);
    expect(screen.getByText(/Amazon Card/)).toBeInTheDocument();
  });

  it("renders the monthly payment amount freed up", () => {
    render(<PayoffMilestone plan={plan} />);
    // fmtMoney(5000) = "$50.00"
    expect(screen.getByText(/\$50\.00\/month/)).toBeInTheDocument();
  });

  it("renders the payoff message", () => {
    render(<PayoffMilestone plan={plan} />);
    expect(screen.getByText(/paid off this month/)).toBeInTheDocument();
  });
});
