import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { AppShell } from "@/components/AppShell/AppShell";
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
  deleteBankAccountRemote: jest.fn(() => Promise.resolve()),
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
      goals: [],
      milestones: [],
      checkingBalance: 0,
      checkingBalanceDate: "2026-04-06",
      bankAccounts: [],
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
    goals: [],
    milestones: [],
    checkingBalance: 0,
    checkingBalanceDate: "2026-04-06",
    bankAccounts: [],
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
    const nav = screen.getByRole("navigation");
    expect(within(nav).getAllByRole("tab")).toHaveLength(5);
    expect(within(nav).getByRole("tab", { name: "Home" })).toBeInTheDocument();
    expect(within(nav).getByRole("tab", { name: "Accounts" })).toBeInTheDocument();
    expect(within(nav).getByRole("tab", { name: "Income" })).toBeInTheDocument();
    expect(within(nav).getByRole("tab", { name: "Payoff" })).toBeInTheDocument();
    expect(within(nav).getByRole("tab", { name: "Snapshots" })).toBeInTheDocument();
    expect(within(nav).queryByRole("tab", { name: "Goals" })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("tab", { name: "Activity" })).not.toBeInTheDocument();
  });

  it("renders the Home tab by default", () => {
    render(<AppShell />);
    // HomeTab renders the Checking balance card
    expect(screen.getByText("Checking")).toBeInTheDocument();
  });
});

describe("AppShell — tab navigation", () => {
  it("switches to Payoff tab on click", () => {
    render(<AppShell />);
    fireEvent.click(within(screen.getByRole("navigation")).getByRole("tab", { name: "Payoff" }));
    // AffirmTab empty state when no plans
    expect(screen.getByText(/No installment plans yet/)).toBeInTheDocument();
  });

  it("switches to Income tab on click", () => {
    render(<AppShell />);
    fireEvent.click(screen.getByRole("tab", { name: "Income" }));
    // PaycheckTab renders DateToggle headings with the current month — there are
    // multiple scope-specific panels, so multiple "April 2026" headings exist.
    expect(screen.getAllByRole("heading", { name: "April 2026" }).length).toBeGreaterThan(0);
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
    // Header renders `${timeGreeting()}, ${firstName}` — e.g. "Good morning, Kia"
    await screen.findByText(/, Kia$/);
  });

  it("falls back to user_metadata.name when full_name is absent (line 60 branch)", async () => {
    // full_name is undefined → falls through to name
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: makeUser({ name: "Kia Richards", email: "kia@test.com" }),
      },
    });
    render(<AppShell />);
    await screen.findByText(/, Kia$/);
  });

  it("falls back to email prefix when no name metadata (line 61 branch)", async () => {
    // full_name and name are absent → uses email.split("@")[0]
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: makeUser({ email: "andre@test.com" }),
      },
    });
    render(<AppShell />);
    await screen.findByText(/, andre$/);
  });

  it("falls back to the local household name when no name or email are available", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: makeUser({}),
      },
    });
    render(<AppShell />);
    await screen.findByText(/, Adriane$/);
  });
});

describe("AppShell — sign out", () => {
  it("calls supabase.auth.signOut and router.push('/login') (handleSignOut — lines 87-89)", async () => {
    render(<AppShell />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Sign out/i }));
    });
    expect(mockSignOut).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/login");
  });
});

describe("AppShell — PaycheckTab cross-tab navigation", () => {
  it("switches to Payoff tab via onGoToAffirm callback from PaycheckTab (line 108)", () => {
    render(<AppShell />);
    fireEvent.click(screen.getByRole("tab", { name: "Income" }));
    // WeekAccordion renders Affirm/Savings buttons in ALL week rows (even collapsed);
    // 4 weeks × 1 button = 4 matches — take [0] (the first expanded week)
    fireEvent.click(screen.getAllByRole("button", { name: /Affirm/i })[0]);
    expect(screen.getByText(/No installment plans yet/)).toBeInTheDocument();
  });
});

describe("AppShell — Messages button", () => {
  it("renders the Messages icon and nav status rail", () => {
    render(<AppShell />);
    expect(screen.getByRole("button", { name: "Messages" })).toBeInTheDocument();
    expect(screen.getByText("$2,351.37 left this month")).toBeInTheDocument();
  });
});
