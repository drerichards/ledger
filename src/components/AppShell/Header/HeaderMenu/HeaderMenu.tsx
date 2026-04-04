"use client";

import { useRef, useState, useEffect } from "react";
import styles from "./HeaderMenu.module.css";

type Props = {
  onPrintTab: () => void;
  onPrintAll: () => void;
  onSignOut: () => void;
};

export function HeaderMenu({ onPrintTab, onPrintAll, onSignOut }: Props) {
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
          <button
            className={styles.item}
            role="menuitem"
            onClick={() => { onPrintTab(); close(); }}
          >
            Print This Tab
          </button>
          <button
            className={styles.item}
            role="menuitem"
            onClick={() => { onPrintAll(); close(); }}
          >
            Print All Tabs
          </button>
          <div className={styles.divider} />
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
