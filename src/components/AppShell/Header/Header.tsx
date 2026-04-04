"use client";

import type { AppNotification } from "@/types";
import { fmtMonthFull } from "@/lib/dates";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { HeaderMenu } from "./HeaderMenu/HeaderMenu";
import styles from "./Header.module.css";

type Props = {
  viewMonth: string;
  notifications: AppNotification[];
  seenNotificationIds: string[];
  onMarkNotificationsSeen: (ids: string[]) => void;
  onNavigateToAffirm: () => void;
  onViewAllNotifications: () => void;
  onPrintTab: () => void;
  onPrintAll: () => void;
  onSignOut: () => void;
};

export function Header({
  viewMonth,
  notifications,
  seenNotificationIds,
  onMarkNotificationsSeen,
  onNavigateToAffirm,
  onViewAllNotifications,
  onPrintTab,
  onPrintAll,
  onSignOut,
}: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <h1 className={styles.appName}>Ledger</h1>
        <p className={styles.appSubtitle}>Household Finance Tracker</p>
      </div>

      <time className={styles.currentMonth} dateTime={viewMonth}>
        {fmtMonthFull(viewMonth)}
      </time>

      <div className={styles.actions}>
        <NotificationBell
          notifications={notifications}
          seenIds={seenNotificationIds}
          onMarkSeen={onMarkNotificationsSeen}
          onNavigateToAffirm={onNavigateToAffirm}
          onViewAll={onViewAllNotifications}
        />
        <HeaderMenu
          onPrintTab={onPrintTab}
          onPrintAll={onPrintAll}
          onSignOut={onSignOut}
        />
      </div>
    </header>
  );
}
