import { render, screen } from "@testing-library/react";
import { SpendingDonut } from "./SpendingDonut";
import type { DonutSegment } from "./SpendingDonut";

const segments: DonutSegment[] = [
  { category: "Housing", cents: 121000 },
  { category: "Utilities", cents: 41900 },
  { category: "Insurance", cents: 14800 },
];

describe("SpendingDonut", () => {
  it("renders the title, subtitle, and center total of all segments", () => {
    render(<SpendingDonut segments={segments} subtitle="April 2026 so far" />);
    expect(screen.getByText("Where your money goes")).toBeInTheDocument();
    expect(screen.getByText("April 2026 so far")).toBeInTheDocument();
    // 121000 + 41900 + 14800 = 177700 → $1,777.00
    expect(screen.getByText("$1,777.00")).toBeInTheDocument();
  });

  it("lists each non-zero category in the legend, largest first", () => {
    render(<SpendingDonut segments={segments} subtitle="x" />);
    const labels = screen.getAllByText(/Housing|Utilities|Insurance/);
    expect(labels[0]).toHaveTextContent("Housing");
    expect(screen.getByText("$1,210.00")).toBeInTheDocument();
    expect(screen.getByText("$419.00")).toBeInTheDocument();
  });

  it("omits zero-cent categories from the legend", () => {
    render(
      <SpendingDonut
        segments={[{ category: "Housing", cents: 50000 }, { category: "Loans", cents: 0 }]}
        subtitle="x"
      />,
    );
    expect(screen.getByText("Housing")).toBeInTheDocument();
    expect(screen.queryByText("Loans")).not.toBeInTheDocument();
  });

  it("handles an all-zero / empty month without dividing by zero", () => {
    render(<SpendingDonut segments={[]} subtitle="x" />);
    expect(screen.getByText("$0.00")).toBeInTheDocument();
  });
});
