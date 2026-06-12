import { render, screen, fireEvent } from "@testing-library/react";
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

  it("hides the Messages button (deferred to post-ship rollout)", () => {
    render(<Header {...defaultProps} />);
    expect(screen.queryByLabelText("Messages")).not.toBeInTheDocument();
  });

  it("renders Sign out; Dark-mode toggle is hidden for rollout", () => {
    render(<Header {...defaultProps} />);
    expect(screen.queryByLabelText(/mode/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Sign out")).toBeInTheDocument();
  });

  // ── Rollout-flagged features (showMessages / showDarkMode) ──────────────────
  it("renders the Messages panel + unread badge when showMessages is on", () => {
    render(<Header {...defaultProps} showMessages unseenCount={2} />);
    expect(screen.getByLabelText("Messages")).toBeInTheDocument();
    expect(screen.getByLabelText("2 unread")).toBeInTheDocument();
    expect(screen.getByText("No new messages")).toBeInTheDocument();
  });

  it("renders + toggles the Dark-mode button when showDarkMode is on", () => {
    render(<Header {...defaultProps} showDarkMode />);
    const toggle = screen.getByLabelText("Dark mode");
    fireEvent.click(toggle);
    expect(screen.getByLabelText("Light mode")).toBeInTheDocument();
  });
});
