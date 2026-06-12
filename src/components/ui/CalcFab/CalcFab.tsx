"use client";

import { useEffect, useRef } from "react";
import { useDraggableFab } from "@/hooks/useDraggableFab";
import { QuickMathCalculator } from "@/components/ui/QuickMathCalculator";
import styles from "./CalcFab.module.css";

/**
 * Floating, draggable Quick Math button. Drag to reposition (persisted), click
 * to open/close the calculator panel. Renders nothing until its position
 * resolves client-side (avoids an SSR hydration mismatch).
 *
 * Position is per-pixel and driven by drag, so it can't live in a static CSS
 * class — we set it imperatively on the DOM nodes via refs (no inline-style prop).
 * The panel opens above-left when the button sits near the bottom/right edge,
 * else below/right, so it never spills off-screen.
 */
export function CalcFab() {
  const { pos, open, onPointerDown, toggle } = useDraggableFab();
  const fabRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pos || !fabRef.current) return;
    fabRef.current.style.left = `${pos.x}px`;
    fabRef.current.style.top = `${pos.y}px`;
  }, [pos]);

  useEffect(() => {
    if (!pos || !popRef.current) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    popRef.current.style.left = `${Math.min(Math.max(12, pos.x - 240), vw - 312)}px`;
    popRef.current.style.top = `${pos.y > vh - 500 ? Math.max(12, pos.y - 430) : pos.y + 70}px`;
  }, [pos, open]);

  if (!pos) return null;

  return (
    <>
      <button
        ref={fabRef}
        type="button"
        className={`${styles.fab} ${open ? styles.fabOn : ""}`}
        onMouseDown={onPointerDown}
        onTouchStart={onPointerDown}
        onClick={toggle}
        aria-label="Quick math calculator"
        title="Drag to move · click to open"
      >
        {open ? (
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" fill="none" />
            <rect x="7" y="5" width="10" height="3.5" rx="0.6" fill="currentColor" opacity="0.3" />
            <circle cx="9" cy="12" r="1.1" fill="currentColor" />
            <circle cx="12" cy="12" r="1.1" fill="currentColor" />
            <circle cx="15" cy="12" r="1.1" fill="currentColor" />
            <circle cx="9" cy="15.5" r="1.1" fill="currentColor" />
            <circle cx="12" cy="15.5" r="1.1" fill="currentColor" />
            <rect x="14" y="14.4" width="2.2" height="4.2" rx="0.6" fill="currentColor" />
          </svg>
        )}
      </button>
      {open && (
        <div ref={popRef} className={styles.pop}>
          <QuickMathCalculator />
        </div>
      )}
    </>
  );
}
