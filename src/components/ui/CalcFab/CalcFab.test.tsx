import { render, screen, fireEvent } from "@testing-library/react";
import { CalcFab } from "./CalcFab";

/**
 * The FAB resolves its position after mount, then click opens the calculator
 * panel. Covers the render-after-mount guard and the open/positioning branch.
 */
describe("CalcFab", () => {
  it("renders the button and opens the calculator panel on click", () => {
    render(<CalcFab />);
    const fab = screen.getByRole("button", { name: "Quick math calculator" });
    expect(fab).toBeInTheDocument();
    fireEvent.click(fab);
    expect(screen.getByText("Quick math")).toBeInTheDocument();
    // Clicking again closes it.
    fireEvent.click(fab);
    expect(screen.queryByText("Quick math")).not.toBeInTheDocument();
  });
});
