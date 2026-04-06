import { render, screen, fireEvent } from "@testing-library/react";
import { NotificationBell } from "@/components/ui/NotificationBell";
import type { AppNotification } from "@/types";

// ─── Factory ──────────────────────────────────────────────────────────────────

function makeNotification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: "notif-1",
    planId: "plan-1",
    planLabel: "Amazon Card",
    mc: 5000,
    month: "2026-04",
    ...overrides,
  };
}

const noop = () => {};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("NotificationBell — bell button", () => {
  it("renders the bell button", () => {
    render(
      <NotificationBell
        notifications={[]}
        seenIds={[]}
        onMarkSeen={noop}
        onNavigateToAffirm={noop}
        onViewAll={noop}
      />,
    );
    expect(screen.getByRole("button", { name: /Notifications/i })).toBeInTheDocument();
  });

  it("shows no badge when all notifications are seen", () => {
    const n = makeNotification();
    render(
      <NotificationBell
        notifications={[n]}
        seenIds={[n.id]}
        onMarkSeen={noop}
        onNavigateToAffirm={noop}
        onViewAll={noop}
      />,
    );
    expect(screen.queryByLabelText(/unread/)).not.toBeInTheDocument();
  });

  it("shows badge count for unseen notifications", () => {
    const n = makeNotification();
    render(
      <NotificationBell
        notifications={[n]}
        seenIds={[]}
        onMarkSeen={noop}
        onNavigateToAffirm={noop}
        onViewAll={noop}
      />,
    );
    expect(screen.getByLabelText("1 unread")).toBeInTheDocument();
  });

  it("caps badge at '9+' for more than 9 unread", () => {
    const notifications = Array.from({ length: 10 }, (_, i) =>
      makeNotification({ id: `n-${i}`, planLabel: `Plan ${i}` }),
    );
    render(
      <NotificationBell
        notifications={notifications}
        seenIds={[]}
        onMarkSeen={noop}
        onNavigateToAffirm={noop}
        onViewAll={noop}
      />,
    );
    expect(screen.getByText("9+")).toBeInTheDocument();
  });
});

describe("NotificationBell — dropdown", () => {
  it("dropdown is closed initially", () => {
    render(
      <NotificationBell
        notifications={[]}
        seenIds={[]}
        onMarkSeen={noop}
        onNavigateToAffirm={noop}
        onViewAll={noop}
      />,
    );
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens dropdown on bell click", () => {
    render(
      <NotificationBell
        notifications={[]}
        seenIds={[]}
        onMarkSeen={noop}
        onNavigateToAffirm={noop}
        onViewAll={noop}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Notifications/i }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("shows 'No notifications yet' when list is empty and dropdown is open", () => {
    render(
      <NotificationBell
        notifications={[]}
        seenIds={[]}
        onMarkSeen={noop}
        onNavigateToAffirm={noop}
        onViewAll={noop}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Notifications/i }));
    expect(screen.getByText("No notifications yet.")).toBeInTheDocument();
  });

  it("renders notification items in dropdown", () => {
    const n = makeNotification({ planLabel: "Amazon Card" });
    render(
      <NotificationBell
        notifications={[n]}
        seenIds={[]}
        onMarkSeen={noop}
        onNavigateToAffirm={noop}
        onViewAll={noop}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Notifications/i }));
    expect(screen.getByText("Amazon Card is paid off")).toBeInTheDocument();
  });

  it("closes dropdown on second bell click (toggle)", () => {
    render(
      <NotificationBell
        notifications={[]}
        seenIds={[]}
        onMarkSeen={noop}
        onNavigateToAffirm={noop}
        onViewAll={noop}
      />,
    );
    const btn = screen.getByRole("button", { name: /Notifications/i });
    fireEvent.click(btn); // open
    fireEvent.click(btn); // close
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});

describe("NotificationBell — callbacks", () => {
  it("calls onMarkSeen with all notification ids when opening with unread items", () => {
    const onMarkSeen = jest.fn();
    const n1 = makeNotification({ id: "n1" });
    const n2 = makeNotification({ id: "n2", planLabel: "Phone Plan" });
    render(
      <NotificationBell
        notifications={[n1, n2]}
        seenIds={[]}
        onMarkSeen={onMarkSeen}
        onNavigateToAffirm={noop}
        onViewAll={noop}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Notifications/i }));
    expect(onMarkSeen).toHaveBeenCalledWith(["n1", "n2"]);
  });

  it("does NOT call onMarkSeen when all notifications are already seen", () => {
    const onMarkSeen = jest.fn();
    const n = makeNotification();
    render(
      <NotificationBell
        notifications={[n]}
        seenIds={[n.id]}
        onMarkSeen={onMarkSeen}
        onNavigateToAffirm={noop}
        onViewAll={noop}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Notifications/i }));
    expect(onMarkSeen).not.toHaveBeenCalled();
  });

  it("calls onNavigateToAffirm and closes dropdown when a notice is clicked", () => {
    const onNavigateToAffirm = jest.fn();
    const n = makeNotification();
    render(
      <NotificationBell
        notifications={[n]}
        seenIds={[]}
        onMarkSeen={noop}
        onNavigateToAffirm={onNavigateToAffirm}
        onViewAll={noop}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Notifications/i }));
    fireEvent.click(screen.getByText("Amazon Card is paid off"));
    expect(onNavigateToAffirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("calls onViewAll and closes dropdown when 'View all' is clicked", () => {
    const onViewAll = jest.fn();
    render(
      <NotificationBell
        notifications={[]}
        seenIds={[]}
        onMarkSeen={noop}
        onNavigateToAffirm={noop}
        onViewAll={onViewAll}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Notifications/i }));
    fireEvent.click(screen.getByText("View all"));
    expect(onViewAll).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});

describe("NotificationBell — outside click closes dropdown", () => {
  it("closes dropdown on mousedown outside the component", () => {
    render(
      <div>
        <NotificationBell
          notifications={[]}
          seenIds={[]}
          onMarkSeen={noop}
          onNavigateToAffirm={noop}
          onViewAll={noop}
        />
        <button data-testid="outside">Outside</button>
      </div>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Notifications/i }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
