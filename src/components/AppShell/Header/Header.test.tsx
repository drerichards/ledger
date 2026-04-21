import { render, screen } from "@testing-library/react";
import { Header } from "./Header";

const noop = () => {};

const defaultProps = {
  userName: null,
  onSignOut: noop,
  milestones: [],
  unseenCount: 0,
};

describe("Header", () => {
  it("renders the app name", () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText("Ledger")).toBeInTheDocument();
  });

  it("shows a greeting even when userName is null", () => {
    render(<Header {...defaultProps} userName={null} />);
    expect(screen.getByText(/Good /)).toBeInTheDocument();
  });

  it("shows greeting when userName is provided", () => {
    render(<Header {...defaultProps} userName="Kia" />);
    expect(screen.getByText(/, Kia$/)).toBeInTheDocument();
  });

  it("renders the Messages button", () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByLabelText("Messages")).toBeInTheDocument();
  });

  it("renders inline header actions", () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByLabelText(/mode/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Sign out")).toBeInTheDocument();
  });
});
