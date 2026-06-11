import { renderHook, act } from "@testing-library/react";
import { useDraggableFab } from "./useDraggableFab";

/**
 * Guards the floating calculator's drag/open behavior:
 * - resolves an initial position only after mount (SSR-safe),
 * - click toggles open/closed,
 * - a drag suppresses the next toggle so moving the button never opens it.
 */

beforeEach(() => {
  window.localStorage.clear();
  // jsdom defaults to 1024x768 — make the default-corner math deterministic.
  Object.defineProperty(window, "innerWidth", { value: 1024, writable: true });
  Object.defineProperty(window, "innerHeight", { value: 768, writable: true });
});

describe("useDraggableFab", () => {
  it("starts closed with a resolved corner position after mount", () => {
    const { result } = renderHook(() => useDraggableFab());
    expect(result.current.open).toBe(false);
    expect(result.current.pos).toEqual({ x: 1024 - 80, y: 768 - 80 });
  });

  it("restores a saved position from localStorage", () => {
    window.localStorage.setItem("ledger-calc-pos", JSON.stringify({ x: 200, y: 300 }));
    const { result } = renderHook(() => useDraggableFab());
    expect(result.current.pos).toEqual({ x: 200, y: 300 });
  });

  it("toggles open then closed on successive clicks", () => {
    const { result } = renderHook(() => useDraggableFab());
    act(() => result.current.toggle());
    expect(result.current.open).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.open).toBe(false);
  });

  it("close() forces the panel shut", () => {
    const { result } = renderHook(() => useDraggableFab());
    act(() => result.current.toggle());
    expect(result.current.open).toBe(true);
    act(() => result.current.close());
    expect(result.current.open).toBe(false);
  });

  it("suppresses the toggle after a drag moves the button", () => {
    const { result } = renderHook(() => useDraggableFab());
    // Press, move >4px, release — simulates a drag, not a click.
    act(() => {
      result.current.onPointerDown({ clientX: 944, clientY: 688 } as React.MouseEvent);
    });
    act(() => {
      window.dispatchEvent(
        Object.assign(new Event("mousemove", { cancelable: true }), { clientX: 600, clientY: 400 }),
      );
    });
    act(() => {
      window.dispatchEvent(new Event("mouseup"));
    });
    // The synthetic click after a drag must NOT open the panel.
    act(() => result.current.toggle());
    expect(result.current.open).toBe(false);
  });
});
