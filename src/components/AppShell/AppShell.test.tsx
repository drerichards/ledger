import { render, screen, fireEvent, act } from "@testing-library/react";
import { AppShell } from "@/components/AppShell/AppShell";
import type { AppNotification } from "@/types";
import { DEFAULT_PAYCHECK_COLUMNS } from "@/lib/paycheck";
import type { AuthUser } from "@supabase/supabase-js";

// Minimal valid AuthUser — only required fields; optional ones omitted
const makeUser = (overrides: Partial<AuthUser["user_metadata"]> & { email?: string }): AuthUser => ({
  id: "test-user-id",
  aud: "authenticated",
  app_metadata: {},
  user_metadata: overrides,
  created_at: "2026-01-01T00:00:00Z",
  email: overrides.email,
});

// ─── Mock heavy dependencies ──────────────────────────────────────────────────

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));

const mockGetUser = jest.fn<Promise<{ data: { user: AuthUser | null } }>, []>(
  () => Promise.resolve({ data: { user: null } }),
);
const mockSignOut = jest.fn(() => Promise.resolve());

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      signOut: mockSignOut,
    },
  }),
}));

jest.mock("@/lib/supabase/sync", () => ({
  loadFromSupabase: jest.fn(() => Promise.resolve(null)),
  syncStateToSupabase: jest.fn(() => Promise.resolve()),
  deleteBillRemote: jest.fn(() => Promise.resolve()),
  deletePlanRemote: jest.fn(() => Promise.resolve()),
  deleteCheckEntryRemote: jest.fn(() => Promise.resolve()),
}));

jest.mock("@/lib/storage", () => ({
  get INITIAL_STATE() {
    return {
      bills: [],
      plans: [],
      checkLog: [],
      savingsLog: [],
      income: [],
      paycheck: [],
      snapshots: [],
      paycheckViewScope: "monthly" as const,
      paycheckColumns: DEFAULT_PAYCHECK_COLUMNS,
      seenNotificationIds: [],
      checkEditWarningAcked: false,
    };
  },
  loadState: jest.fn(() => ({
    bills: [],
    plans: [],
    checkLog: [],
    savingsLog: [],
    income: [],
    paycheck: [],
    snapshots: [],
    paycheckViewScope: "monthly" as const,
    paycheckColumns: DEFAULT_PAYCHECK_COLUMNS,
    seenNotificationIds: [],
    checkEditWarningAcked: false,
  })),
  saveState: jest.fn(),
  clearState: jest.fn(),
}));

jest.mock("@/lib/dates", () => ({
  ...jest.requireActual("@/lib/dates"),
  currentMonth: jest.fn(() => "2026-04"),
  today: jest.fn(() => "2026-04-06"),
  getMondaysUpToMonth: jest.fn(() => ["2026-04-06", "2026-04-13"]),
  getMondaysInMonth: jest.fn(() => ["2026-04-06", "2026-04-13", "2026-04-20", "2026-04-27"]),
  mondayOf: jest.fn((d: string) => d),
}));

jest.mock("@/hooks/useAffirmNotifications", () => ({
  useAffirmNotifications: jest.fn(() => []),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AppShell — rendering", () => {
  it("renders the app header", () => {
    render(<AppShell />);
    expect(screen.getByText("Ledger")).toBeInTheDocument();
  });

  it("renders the tab navigation", () => {
    render(<AppShell />);
    expect(screen.getByRole("tab", { name: "Accounts" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Paycheck" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Affirm" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Savings" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Snapshots" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Activity" })).toBeInTheDocument();
  });

  it("renders the Accounts tab by default", () => {
    render(<AppShell />);
    expect(screen.getByText("Bill Chart")).toBeInTheDocument();
  });
});

describe("AppShell — tab navigation", () => {
  it("switches to Affirm tab on click", () => {
    render(<AppShell />);
    fireEvent.click(screen.getByRole("tab", { name: "Affirm" }));
    expect(screen.getByText("Affirm Plans")).toBeInTheDocument();
  });

  it("switches to Savings tab on click", () => {
    render(<AppShell />);
    fireEvent.click(screen.getByRole("tab", { name: "Savings" }));
    expect(screen.getByText("Savings & Projections")).toBeInTheDocument();
  });

  it("switches to Activity tab on click", () => {
    render(<AppShell />);
    fireEvent.click(screen.getByRole("tab", { name: "Activity" }));
    // "Activity" appears in both the tab button and the h2 heading — use heading role
    expect(screen.getByRole("heading", { name: "Activity" })).toBeInTheDocument();
  });

  it("switches to Paycheck tab on click", () => {
    render(<AppShell />);
    fireEvent.click(screen.getByRole("tab", { name: "Paycheck" }));
    // PaycheckTab renders a heading with the current month
    expect(screen.getByRole("heading", { name: "April 2026" })).toBeInTheDocument();
  });

  it("switches to Snapshots tab on click (line 173 tabPanelActive branch)", () => {
    render(<AppShell />);
    const tab = screen.getByRole("tab", { name: "Snapshots" });
    fireEvent.click(tab);
    expect(tab).toHaveAttribute("aria-selected", "true");
  });
});

describe("AppShell — user auth", () => {
  it("populates userName from supabase when user has full_name metadata", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: makeUser({ full_name: "Kia Richards", email: "kia@test.com" }),
      },
    });
    render(<AppShell />);
    await screen.findByText("Hi, Kia");
  });

  it("falls back to user_metadata.name when full_name is absent (line 60 branch)", async () => {
    // full_name is undefined → falls through to name
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: makeUser({ name: "Kia Richards", email: "kia@test.com" }),
      },
    });
    render(<AppShell />);
    await screen.findByText("Hi, Kia");
  });

  it("falls back to email prefix when no name metadata (line 61 branch)", async () => {
    // full_name and name are absent → uses email.split("@")[0]
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: makeUser({ email: "andre@test.com" }),
      },
    });
    render(<AppShell />);
    await screen.findByText("Hi, andre");
  });

  it("sets userName to null when no name or email available (line 62 + line 63 ?? branch)", async () => {
    // All fallbacks produce null → fullName = null → firstName = null → Hi, span not rendered
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: makeUser({}),
      },
    });
    render(<AppShell />);
    // Flush the getUser promise
    await act(async () => {});
    // No "Hi," greeting when username is null
    expect(screen.queryByText(/Hi,/)).not.toBeInTheDocument();
  });
});

describe("AppShell — print", () => {
  it("calls window.print via handlePrintAll after a short delay", () => {
    jest.useFakeTimers();
    const printSpy = jest.spyOn(window, "print").mockImplementation(() => {});
    render(<AppShell />);
    // Open the header menu, then click "Print All Tabs"
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Print All Tabs" }));
    act(() => { jest.runAllTimers(); });
    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
    jest.useRealTimers();
  });

  it("calls window.print immediately via handlePrintTab", () => {
    const printSpy = jest.spyOn(window, "print").mockImplementation(() => {});
    render(<AppShell />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Print This Tab" }));
    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });
});

describe("AppShell — sign out", () => {
  it("calls supabase.auth.signOut and router.push('/login') (handleSignOut — lines 87-89)", async () => {
    render(<AppShell />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));
    });
    expect(mockSignOut).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/login");
  });
});

describe("AppShell — PaycheckTab cross-tab navigation", () => {
  it("switches to Affirm tab via onGoToAffirm callback from PaycheckTab (line 108)", () => {
    render(<AppShell />);
    fireEvent.click(screen.getByRole("tab", { name: "Paycheck" }));
    // WeekAccordion renders Affirm/Savings buttons in ALL week rows (even collapsed);
    // 4 weeks × 1 button = 4 matches — take [0] (the first expanded week)
    fireEvent.click(screen.getAllByRole("button", { name: "Affirm" })[0]);
    expect(screen.getByText("Affirm Plans")).toBeInTheDocument();
  });

  it("switches to Savings tab via onGoToSavings callback from PaycheckTab (line 109)", () => {
    render(<AppShell />);
    fireEvent.click(screen.getByRole("tab", { name: "Paycheck" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Savings" })[0]);
    expect(screen.getByText("Savings & Projections")).toBeInTheDocument();
  });
});

describe("AppShell — notification callbacks", () => {
  it("calls router.push('/notifications') when View all is clicked (line 122)", async () => {
    render(<AppShell />);
    // Open the notification bell dropdown
    fireEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "View all" }));
    });
    expect(mockPush).toHaveBeenCalledWith("/notifications");
  });

  it("navigates to Affirm tab when a notification is clicked (onNavigateToAffirm — line 121)", () => {
    const { useAffirmNotifications } = jest.requireMock("@/hooks/useAffirmNotifications");
    // mockReturnValueOnce is consumed on the initial render; the bell-click causes a
    // re-render which would get the default []. Use mockImplementation so every call
    // (including re-renders) returns the notification list.
    (useAffirmNotifications as jest.Mock).mockImplementation(() => [
      { id: "n1", planLabel: "Amazon Card", mc: 5000, month: "2026-04" },
    ] as AppNotification[]);

    render(<AppShell />);
    fireEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    fireEvent.click(screen.getByRole("option", { name: /Amazon Card/ }));
    // Affirm tab becomes active — heading confirms
    expect(screen.getByText("Affirm Plans")).toBeInTheDocument();

    // Restore default so other tests aren't affected
    (useAffirmNotifications as jest.Mock).mockImplementation(() => []);
  });
});
