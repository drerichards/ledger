import { render, screen } from "@testing-library/react";
import { GaugeMeter } from "./GaugeMeter";

describe("GaugeMeter", () => {
  it("renders the big value, label, and tag", () => {
    render(<GaugeMeter value={0.69} tone="olive" big="9/13" label="Bills handled" tag="ON TRACK" />);
    expect(screen.getByText("9/13")).toBeInTheDocument();
    expect(screen.getByText("Bills handled")).toBeInTheDocument();
    expect(screen.getByText("ON TRACK")).toBeInTheDocument();
  });

  it("exposes an accessible label combining label and value", () => {
    render(<GaugeMeter value={0.25} tone="rust" big="25%" label="Car fund" tag="EARLY" />);
    expect(screen.getByRole("img", { name: "Car fund: 25%" })).toBeInTheDocument();
  });

  it("clamps out-of-range values without throwing", () => {
    render(<GaugeMeter value={2} tone="amber" big="June" label="Next payoff" tag="SOON" />);
    expect(screen.getByText("June")).toBeInTheDocument();
  });
});
