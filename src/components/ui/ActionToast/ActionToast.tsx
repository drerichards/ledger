"use client";

import { useEffect } from "react";
import styles from "./ActionToast.module.css";

type Props = {
  message: string | null;
  onDone: () => void;
};

export function ActionToast({ message, onDone }: Props) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDone, 2200);
    return () => clearTimeout(timer);
  }, [message, onDone]);

  if (!message) return null;

  return (
    <div className={styles.toast} role="status" aria-live="polite">
      <span className={styles.icon} aria-hidden="true">
        ✓
      </span>
      <span className={styles.label}>{message}</span>
    </div>
  );
}
