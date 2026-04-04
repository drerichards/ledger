import { renderHook, act } from "@testing-library/react";
import { useGoogleSignIn } from "./useGoogleSignIn";

// ─── Mock Supabase client ─────────────────────────────────────────────────────

const mockSignInWithOAuth = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => ({
    auth: { signInWithOAuth: mockSignInWithOAuth },
  })),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setSearchParams(params: string) {
  Object.defineProperty(window, "location", {
    writable: true,
    value: { ...window.location, search: params, origin: "http://localhost" },
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  setSearchParams("");
  mockSignInWithOAuth.mockResolvedValue({ error: null });
});

describe("useGoogleSignIn — initial state", () => {
  it("errorMsg is null when no ?error param in URL", () => {
    setSearchParams("");
    const { result } = renderHook(() => useGoogleSignIn());
    expect(result.current.errorMsg).toBeNull();
  });

  it("errorMsg is set when ?error param is present", () => {
    setSearchParams("?error=auth");
    const { result } = renderHook(() => useGoogleSignIn());
    expect(result.current.errorMsg).toBe("Sign-in failed. Please try again.");
  });

  it("loading starts as false", () => {
    const { result } = renderHook(() => useGoogleSignIn());
    expect(result.current.loading).toBe(false);
  });
});

describe("useGoogleSignIn — signIn", () => {
  it("sets loading to true while sign-in is in flight", async () => {
    // Never resolves during this test — so loading stays true
    mockSignInWithOAuth.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useGoogleSignIn());

    act(() => { result.current.signIn(); });

    expect(result.current.loading).toBe(true);
  });

  it("calls supabase.auth.signInWithOAuth with google provider", async () => {
    const { result } = renderHook(() => useGoogleSignIn());

    await act(async () => { await result.current.signIn(); });

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: expect.objectContaining({
        redirectTo: expect.stringContaining("/auth/callback"),
      }),
    });
  });

  it("sets errorMsg when signInWithOAuth returns an error", async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: new Error("provider disabled") });
    const { result } = renderHook(() => useGoogleSignIn());

    await act(async () => { await result.current.signIn(); });

    expect(result.current.errorMsg).toBe("Sign-in failed. Please try again.");
  });

  it("resets loading to false on oauth error", async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: new Error("provider disabled") });
    const { result } = renderHook(() => useGoogleSignIn());

    await act(async () => { await result.current.signIn(); });

    expect(result.current.loading).toBe(false);
  });

  it("clears a previous errorMsg when signIn is called", async () => {
    setSearchParams("?error=auth");
    const { result } = renderHook(() => useGoogleSignIn());
    expect(result.current.errorMsg).toBe("Sign-in failed. Please try again.");

    await act(async () => { await result.current.signIn(); });

    // signIn calls setErrorMsg(null) before the oauth attempt
    // On success (no error returned) errorMsg stays null
    expect(result.current.errorMsg).toBeNull();
  });
});
