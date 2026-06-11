"use client";

import React from "react";
import styles from "./CollapsibleTable.module.css";

export type CollapsibleTableVariant = "navy" | "olive";

type Props = {
  label: string;
  variant?: CollapsibleTableVariant;
  isCollapsed: boolean;
  onToggle: () => void;
  /** Shown in the header when collapsed (e.g., group subtotal). */
  collapsedSubtotal?: React.ReactNode;
  /** Left label in the footer bar — omit footerValue to hide bar entirely. */
  footerLabel?: React.ReactNode;
  footerValue?: React.ReactNode;
  /** Flex-1 layout mode (both groups share vertical space). */
  split?: boolean;
  /** Table markup or any content to render inside the collapsible body. */
  children: React.ReactNode;
};

export function CollapsibleTable({
  label,
  variant = "navy",
  isCollapsed,
  onToggle,
  collapsedSubtotal,
  footerLabel,
  footerValue,
  split = false,
  children,
}: Props) {
  const variantClass = variant === "olive" ? styles.groupOlive : styles.groupNavy;

  return (
    <div
      className={`${styles.group} ${variantClass} ${split ? styles.groupSplit : ""} ${isCollapsed ? styles.groupCollapsed : ""}`}
    >
      <button
        type="button"
        className={styles.groupHeader}
        onClick={onToggle}
        aria-expanded={!isCollapsed}
      >
        <span className={styles.collapseIcon}>{isCollapsed ? "►" : "▼"}</span>
        <span className={styles.groupLabel}>{label}</span>
      </button>

      {/* Row list — clips to 0 in a collapsed group (flex-grow 0 → min-content). */}
      <div className={styles.tableWrapper}>
        <div className={styles.tableWrapperInner}>
          <div className={styles.tableViewport}>{children}</div>
        </div>
      </div>

      {/* Subtotal bar — always shown (open or collapsed), so the running total
          stays visible even when the rows are hidden. */}
      {(footerValue ?? collapsedSubtotal) != null && (
        <div className={`${styles.totalBar} ${variant === "olive" ? styles.totalBarOlive : ""}`}>
          {footerLabel != null && <div className={styles.totalLabel}>{footerLabel}</div>}
          <div className={styles.totalValue}>{footerValue ?? collapsedSubtotal}</div>
        </div>
      )}
    </div>
  );
}
