"use client";

import { useRef, useState, useEffect } from "react";
import type { AppNotification } from "@/types";
import { fmtMoney } from "@/lib/money";
import { fmtMonthFull } from "@/lib/dates";
import styles from "./NotificationBell.module.css";

type Props = {
  notifications: AppNotification[];
  seenIds: string[];
  onMarkSeen: (ids: string[]) => void;
  onNavigateToAffirm: () => void;
  onViewAll: () => void;
};

/**
 * Bell icon with unread badge. Clicking opens a dropdown of payoff notices.
 *
 * - Badge shows count of unseen notifications.
 * - Opening the dropdown marks all current notifications as seen.
 * - Each notice navigates to the Affirm tab on click.
 * - "View all" navigates to the /notifications history log.
 */
export function NotificationBell({
  notifications,
  seenIds,
  onMarkSeen,
  onNavigateToAffirm,
  onViewAll,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !seenIds.includes(n.id)).length;

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

  const handleOpen = () => {
    setOpen((v) => !v);
    // Mark all as seen when the dropdown opens
    if (!open && unreadCount > 0) {
      onMarkSeen(notifications.map((n) => n.id));
    }
  };

  const handleNoticeClick = () => {
    setOpen(false);
    onNavigateToAffirm();
  };

  const handleViewAll = () => {
    setOpen(false);
    onViewAll();
  };

  return (
    <div className={styles.root} ref={ref} data-print-hide>
      <button
        type="button"
        className={styles.bell}
        onClick={handleOpen}
        aria-label={`Notifications${unreadCount > 0 ? ` — ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {/* Bell SVG — inline, no external dep */}
        <svg
          className={styles.icon}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M10 2a6 6 0 00-6 6v2.586l-.707.707A1 1 0 004 13h12a1 1 0 00.707-1.707L16 10.586V8a6 6 0 00-6-6zm0 16a2 2 0 01-2-2h4a2 2 0 01-2 2z" />
        </svg>
        {unreadCount > 0 && (
          <span className={styles.badge} aria-label={`${unreadCount} unread`}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={styles.dropdown} role="listbox" aria-label="Notifications">
          <div className={styles.dropdownHeader}>
            <span className={styles.dropdownTitle}>Notifications</span>
            <button
              type="button"
              className={styles.viewAllBtn}
              onClick={handleViewAll}
            >
              View all
            </button>
          </div>

          {notifications.length === 0 ? (
            <p className={styles.empty}>No notifications yet.</p>
          ) : (
            <ul className={styles.list}>
              {notifications.slice(0, 5).map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`${styles.item} ${seenIds.includes(n.id) ? styles.itemSeen : styles.itemUnseen}`}
                    onClick={handleNoticeClick}
                    role="option"
                    aria-selected={false}
                  >
                    <span className={styles.itemLabel}>
                      {n.planLabel} is paid off
                    </span>
                    <span className={styles.itemMeta}>
                      You freed up{" "}
                      <strong className={styles.amount}>
                        {fmtMoney(n.mc)}/mo
                      </strong>{" "}
                      · {fmtMonthFull(n.month)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
