"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./HeaderMenu.module.css";

type Props = {
  onSignOut: () => void;
  unseenCount?: number;
};

const THEME_KEY = "ledger-theme";

export function HeaderMenu({ onSignOut, unseenCount = 0 }: Props) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = typeof window !== "undefined"
      ? window.localStorage.getItem(THEME_KEY)
      : null;
    const resolved = saved === "dark" ? "dark" : "light";
    setTheme(resolved);
    document.documentElement.dataset.theme = resolved;
  }, []);

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
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem(THEME_KEY, next);
    close();
  };

  return (
    <div className={styles.root} ref={ref} data-print-hide>
      <button
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-label="Open menu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <svg viewBox="0 0 16 16" className={styles.chevron} aria-hidden="true">
          <path d="M3.5 6 8 10.5 12.5 6" />
        </svg>
      </button>

      {open && (
        <div className={styles.dropdown} role="menu">
          <button className={styles.item} role="menuitem" onClick={close}>
            <span className={styles.itemIcon}>✉</span>
            <span className={styles.itemLabel}>Messages</span>
            <span className={styles.itemMeta}>{unseenCount}</span>
          </button>
          <button className={styles.item} role="menuitem" onClick={toggleTheme}>
            <span className={styles.itemIcon}>{theme === "dark" ? "☀" : "☾"}</span>
            <span className={styles.itemLabel}>
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </span>
          </button>
          <div className={styles.divider} />
          <button
            className={`${styles.item} ${styles.itemDanger}`}
            role="menuitem"
            onClick={() => { onSignOut(); close(); }}
          >
            <span className={styles.itemIcon}>⇢</span>
            <span className={styles.itemLabel}>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
}
