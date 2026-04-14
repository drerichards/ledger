"use client";

import { useRef, useState, useEffect } from "react";
import styles from "./HeaderMenu.module.css";

type Props = {
  onSignOut: () => void;
  onResetToSeed?: () => void;
};

export function HeaderMenu({ onSignOut, onResetToSeed }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const close = () => setOpen(false);

  return (
    <div className={styles.root} ref={ref} data-print-hide>
      <button
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-label="Open menu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </button>

      {open && (
        <div className={styles.dropdown} role="menu">
          {onResetToSeed && (
            <button
              className={`${styles.item} ${styles.itemDanger}`}
              role="menuitem"
              onClick={() => { onResetToSeed(); close(); }}
            >
              ⚠ Reset to Seed Data
            </button>
          )}
          {onResetToSeed && <div className={styles.divider} />}
          <button
            className={`${styles.item} ${styles.itemDanger}`}
            role="menuitem"
            onClick={() => { onSignOut(); close(); }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
