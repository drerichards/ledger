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
  children,
}: Props) {
  const variantClass = variant === "olive" ? styles.groupOlive : styles.groupNavy;

  return (
    <div
      data-acc-group
      data-acc-open={isCollapsed ? "false" : "true"}
      className={`${styles.group} ${variantClass} ${isCollapsed ? styles.groupCollapsed : ""}`}
    >
      <button
        type="button"
        data-acc-chrome
        className={styles.groupHeader}
        onClick={onToggle}
        aria-expanded={!isCollapsed}
      >
        <span className={styles.collapseIcon}>{isCollapsed ? "►" : "▼"}</span>
        <span className={styles.groupLabel}>{label}</span>
      </button>

      {/* Row list. Its parent group's height is set by the accordion layout
          effect (in AccountsTab); this clips/scrolls to fit. */}
      <div className={styles.tableWrapper}>
        <div className={styles.tableWrapperInner}>
          <div data-acc-list className={styles.tableViewport}>{children}</div>
        </div>
      </div>

      {/* Subtotal bar — always shown (open or collapsed). */}
      {(footerValue ?? collapsedSubtotal) != null && (
        <div
          data-acc-chrome
          className={`${styles.totalBar} ${variant === "olive" ? styles.totalBarOlive : ""}`}
        >
          {footerLabel != null && <div className={styles.totalLabel}>{footerLabel}</div>}
          <div className={styles.totalValue}>{footerValue ?? collapsedSubtotal}</div>
        </div>
      )}
    </div>
  );
}
