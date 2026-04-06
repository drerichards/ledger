import { render, screen } from "@testing-library/react";
import { StatCard } from "@/components/ui/StatCard";

describe("StatCard", () => {
  it("renders the label", () => {
    render(<StatCard label="Monthly Total" value="$1,200.00" />);
    expect(screen.getByText("Monthly Total")).toBeInTheDocument();
  });

  it("renders the value when provided", () => {
    render(<StatCard label="Paid" value="$800.00" />);
    expect(screen.getByText("$800.00")).toBeInTheDocument();
  });

  it("renders subRows instead of a single value", () => {
    render(
      <StatCard
        label="Monthly Total"
        subRows={[
          { label: "From Kia's Pay", value: "$900.00" },
          { label: "From Other Income", value: "$300.00" },
        ]}
      />
    );
    expect(screen.getByText("From Kia's Pay")).toBeInTheDocument();
    expect(screen.getByText("$900.00")).toBeInTheDocument();
    expect(screen.getByText("From Other Income")).toBeInTheDocument();
    expect(screen.getByText("$300.00")).toBeInTheDocument();
  });

  it("renders without crashing when no value or subRows are provided", () => {
    render(<StatCard label="Empty" />);
    expect(screen.getByText("Empty")).toBeInTheDocument();
  });
});
