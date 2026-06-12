import { render, screen, fireEvent } from "@testing-library/react";
import { HelpGuide } from "./HelpGuide";

describe("HelpGuide", () => {
  it("renders the indexed guide with the first section open by default", () => {
    render(<HelpGuide onClose={() => {}} />);
    expect(screen.getByText("How to use Ledger")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accounts" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Payoff" })).toBeInTheDocument();
    expect(screen.getByText("What this app is for")).toBeInTheDocument();
  });

  it("switches sections when an index chip is clicked", () => {
    render(<HelpGuide onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Accounts" }));
    expect(screen.getByText("Accounts — your bills")).toBeInTheDocument();
    expect(screen.getByText(/three dots/)).toBeInTheDocument();
  });

  it("closes via the Got it button", () => {
    const onClose = jest.fn();
    render(<HelpGuide onClose={onClose} />);
    // "Got it" appears on the last section — jump there via the last index chip.
    fireEvent.click(screen.getByRole("button", { name: "Extras" }));
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("paginates with Back/Next and shows the page count", () => {
    render(<HelpGuide onClose={() => {}} />);
    expect(screen.getByText("1 of 6")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "‹ Back" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next ›" }));
    expect(screen.getByText("2 of 6")).toBeInTheDocument();
    expect(screen.getByText("Home — your quick answer")).toBeInTheDocument();
  });
});
