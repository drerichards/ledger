import { render, screen, fireEvent } from "@testing-library/react";
import { MomentumGauges } from "./MomentumGauges";
import type { GaugeData } from "./MomentumGauges";

const gauges: [GaugeData, GaugeData, GaugeData] = [
  { value: 0.69, tone: "olive", big: "9/13", label: "Bills handled", tag: "ON TRACK" },
  { value: 0.5, tone: "amber", big: "June", label: "Next payoff", tag: "SOON" },
  { value: 0.25, tone: "rust", big: "25%", label: "Car fund", tag: "EARLY" },
];

describe("MomentumGauges", () => {
  it("renders the header and all three gauges", () => {
    render(<MomentumGauges gauges={gauges} />);
    expect(screen.getByText("Momentum")).toBeInTheDocument();
    expect(screen.getByText("Bills handled")).toBeInTheDocument();
    expect(screen.getByText("Next payoff")).toBeInTheDocument();
    expect(screen.getByText("Car fund")).toBeInTheDocument();
  });

  it("makes a gauge clickable and fires its onClick (e.g. payoff → Payoff tab)", () => {
    const onClick = jest.fn();
    const withClick: [GaugeData, GaugeData, GaugeData] = [
      gauges[0],
      { ...gauges[1], onClick },
      gauges[2],
    ];
    render(<MomentumGauges gauges={withClick} />);
    fireEvent.click(screen.getByRole("button", { name: /Next payoff/ }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders a non-clickable gauge as a non-button when it has no onClick", () => {
    render(<MomentumGauges gauges={gauges} />);
    // None of the sample gauges have onClick → no gauge buttons.
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
