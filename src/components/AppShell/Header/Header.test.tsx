import { render, screen } from "@testing-library/react";
import { Header } from "./Header";

const noop = () => {};

const defaultProps = {
  userName: null,
  notifications: [],
  seenNotificationIds: [],
  onMarkNotificationsSeen: noop,
  onNavigateToAffirm: noop,
  onViewAllNotifications: noop,
  onSignOut: noop,
};

describe("Header", () => {
  it("renders the app name", () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText("Ledger")).toBeInTheDocument();
  });

  it("renders the subtitle", () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText("Household Finance Tracker")).toBeInTheDocument();
  });

  it("does not show userName when null", () => {
    render(<Header {...defaultProps} userName={null} />);
    expect(screen.queryByText(/Hi,/)).not.toBeInTheDocument();
  });

  it("shows greeting when userName is provided", () => {
    render(<Header {...defaultProps} userName="Kia" />);
    expect(screen.getByText(/, Kia$/)).toBeInTheDocument();
  });

  it("renders the Messages button", () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByLabelText("Messages")).toBeInTheDocument();
  });

  it("renders the HeaderMenu trigger", () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByLabelText("Open menu")).toBeInTheDocument();
  });
});
