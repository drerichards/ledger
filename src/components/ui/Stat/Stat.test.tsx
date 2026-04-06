import { render, screen } from "@testing-library/react";
import { Stat } from "@/components/ui/Stat/Stat";

describe("Stat", () => {
  it("renders the label", () => {
    render(<Stat label="Total Bills" value="$1,234.00" />);
    expect(screen.getByText("Total Bills")).toBeInTheDocument();
  });

  it("renders the value", () => {
    render(<Stat label="Total Bills" value="$1,234.00" />);
    expect(screen.getByText("$1,234.00")).toBeInTheDocument();
  });

  it("applies rust color class when color='rust'", () => {
    render(<Stat label="Short" value="-$50" color="rust" />);
    // The value span should have the rust class applied
    const valueEl = screen.getByText("-$50");
    expect(valueEl.className).toMatch(/rust/);
  });

  it("applies olive color class when color='olive'", () => {
    render(<Stat label="Surplus" value="+$50" color="olive" />);
    const valueEl = screen.getByText("+$50");
    expect(valueEl.className).toMatch(/olive/);
  });

  it("applies no color class when color is omitted", () => {
    render(<Stat label="Income" value="$2,000.00" />);
    const valueEl = screen.getByText("$2,000.00");
    // No rust or olive class when color is undefined
    expect(valueEl.className).not.toMatch(/rust/);
    expect(valueEl.className).not.toMatch(/olive/);
  });

  it("applies compact class when compact=true", () => {
    const { container } = render(
      <Stat label="Total" value="$100" compact />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toMatch(/compact/);
  });

  it("does not apply compact class when compact is omitted", () => {
    const { container } = render(<Stat label="Total" value="$100" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).not.toMatch(/compact/);
  });
});
