import { renderHook, act } from "@testing-library/react";
import { useIdleTimeout } from "./useIdleTimeout";

// ─── Mock Supabase client ─────────────────────────────────────────────────────

const mockSignOut = jest.fn(() => Promise.resolve());

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => ({
    auth: { signOut: mockSignOut },
  })),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockAssign = jest.fn();

function stubLocation() {
  // useIdleTimeout does a hard redirect via window.location.assign on timeout.
  // Override so the test can assert the redirect without navigating jsdom.
  Object.defineProperty(window, "location", {
    writable: true,
    value: { ...window.location, assign: mockAssign },
  });
}

const ONE_MINUTE = 60 * 1000;
const DEFAULT_TIMEOUT = 15 * ONE_MINUTE;

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  stubLocation();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe("useIdleTimeout — auto-logout", () => {
  it("does NOT log out before the timeout window elapses", () => {
    renderHook(() => useIdleTimeout());

    act(() => {
      jest.advanceTimersByTime(DEFAULT_TIMEOUT - ONE_MINUTE);
    });

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockAssign).not.toHaveBeenCalled();
  });

  it("signs out and redirects to /login?error=idle after the default window", async () => {
    renderHook(() => useIdleTimeout());

    await act(async () => {
      jest.advanceTimersByTime(DEFAULT_TIMEOUT);
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockAssign).toHaveBeenCalledWith("/login?error=idle");
  });

  it("respects a custom timeoutMs", async () => {
    renderHook(() => useIdleTimeout({ timeoutMs: 5 * ONE_MINUTE }));

    await act(async () => {
      jest.advanceTimersByTime(5 * ONE_MINUTE);
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});

describe("useIdleTimeout — activity resets the timer", () => {
  it("does NOT log out when user activity occurs within the window", () => {
    renderHook(() => useIdleTimeout());

    // Almost time out, then a keypress resets the clock.
    act(() => {
      jest.advanceTimersByTime(DEFAULT_TIMEOUT - ONE_MINUTE);
      window.dispatchEvent(new Event("keydown"));
      jest.advanceTimersByTime(DEFAULT_TIMEOUT - ONE_MINUTE);
    });

    // Total elapsed > one window, but never idle for a full window.
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("logs out a full window AFTER the last activity", async () => {
    renderHook(() => useIdleTimeout());

    act(() => {
      jest.advanceTimersByTime(DEFAULT_TIMEOUT - ONE_MINUTE);
      window.dispatchEvent(new Event("mousedown"));
    });

    await act(async () => {
      jest.advanceTimersByTime(DEFAULT_TIMEOUT);
    });

    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});

describe("useIdleTimeout — lifecycle", () => {
  it("calls onTimeout before signing out", async () => {
    const onTimeout = jest.fn();
    renderHook(() => useIdleTimeout({ onTimeout }));

    await act(async () => {
      jest.advanceTimersByTime(DEFAULT_TIMEOUT);
    });

    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it("clears the timer on unmount (no logout after teardown)", () => {
    const { unmount } = renderHook(() => useIdleTimeout());

    unmount();

    act(() => {
      jest.advanceTimersByTime(DEFAULT_TIMEOUT * 2);
    });

    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
