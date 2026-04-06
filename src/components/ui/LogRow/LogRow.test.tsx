import { render, screen, fireEvent } from "@testing-library/react";
import { LogRow } from "@/components/ui/LogRow";

describe("LogRow", () => {
  it("renders the date and value", () => {
    render(<LogRow date="Apr 6, 2026" value="$764.23" />);
    expect(screen.getByText("Apr 6, 2026")).toBeInTheDocument();
    expect(screen.getByText("$764.23")).toBeInTheDocument();
  });

  it("does not render a delete button by default", () => {
    render(<LogRow date="Apr 6, 2026" value="$764.23" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a delete button when onDelete is provided", () => {
    render(<LogRow date="Apr 6, 2026" value="$764.23" onDelete={jest.fn()} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("calls onDelete when the delete button is clicked", () => {
    const onDelete = jest.fn();
    render(<LogRow date="Apr 6, 2026" value="$764.23" onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("uses deleteLabel as the button aria-label", () => {
    render(
      <LogRow
        date="Apr 6, 2026"
        value="$764.23"
        onDelete={jest.fn()}
        deleteLabel="Delete April 6 entry"
      />
    );
    expect(screen.getByRole("button", { name: "Delete April 6 entry" })).toBeInTheDocument();
  });

  it("applies valueSavings class when variant is 'savings' (line 33 truthy branch)", () => {
    const { container } = render(
      <LogRow date="Apr 6, 2026" value="$50.00" variant="savings" />,
    );
    expect(container.querySelector(".valueSavings")).toBeInTheDocument();
  });
});
