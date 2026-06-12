"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Drag + open state for a floating action button (the Quick Math calculator).
 *
 * Position resolves client-side only (needs `window`), so the FAB renders nothing
 * until mounted — this avoids an SSR hydration mismatch. The last position is
 * persisted to localStorage so the calculator stays where the user left it.
 *
 * A drag of >4px sets `moved`, which suppresses the click-to-open toggle — so
 * dragging the button never accidentally opens/closes the panel. Each drag
 * session registers its own window listeners and tears them down on release.
 */

export type FabPos = { x: number; y: number };

const STORAGE_KEY = "ledger-calc-pos";
const MARGIN = 12;
const SIZE = 70;

export function useDraggableFab() {
  const [pos, setPos] = useState<FabPos | null>(null);
  const [open, setOpen] = useState(false);
  const posRef = useRef<FabPos | null>(null);
  const moved = useRef(false);

  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  const clampToViewport = useCallback(
    (p: FabPos): FabPos => ({
      x: Math.min(Math.max(MARGIN, p.x), window.innerWidth - SIZE),
      y: Math.min(Math.max(MARGIN, p.y), window.innerHeight - SIZE),
    }),
    [],
  );

  // Resolve the initial position after mount (client-only).
  useEffect(() => {
    let initial: FabPos | null = null;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (saved && typeof saved.x === "number" && typeof saved.y === "number") {
        initial = saved;
      }
    } catch {
      // ignore malformed storage — fall through to default corner
    }
    const fallback = { x: window.innerWidth - 80, y: window.innerHeight - 80 };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only initial FAB position
    setPos(clampToViewport(initial ?? fallback));

    const onResize = () => {
      if (posRef.current) {
        setPos(clampToViewport(posRef.current));
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampToViewport]);

  const onPointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const start = "touches" in e ? e.touches[0] : (e as React.MouseEvent);
      const origin = posRef.current ?? { x: 0, y: 0 };
      const offX = start.clientX - origin.x;
      const offY = start.clientY - origin.y;
      moved.current = false;

      const move = (ev: MouseEvent | TouchEvent) => {
        if (ev.cancelable && "touches" in ev) ev.preventDefault();
        const pt = "touches" in ev ? ev.touches[0] : (ev as MouseEvent);
        const next = clampToViewport({ x: pt.clientX - offX, y: pt.clientY - offY });
        const prev = posRef.current;
        if (prev && Math.abs(next.x - prev.x) + Math.abs(next.y - prev.y) > 4) {
          moved.current = true;
        }
        setPos(next);
      };

      const up = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
        window.removeEventListener("touchmove", move);
        window.removeEventListener("touchend", up);
        if (posRef.current) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(posRef.current));
          } catch {
            // storage may be unavailable (private mode) — position is non-critical
          }
        }
      };

      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
      window.addEventListener("touchmove", move, { passive: false });
      window.addEventListener("touchend", up);
    },
    [clampToViewport],
  );

  const toggle = useCallback(() => {
    // A drag just ended — swallow the synthetic click so it doesn't toggle.
    if (moved.current) {
      moved.current = false;
      return;
    }
    setOpen((o) => !o);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  return { pos, open, onPointerDown, toggle, close };
}
