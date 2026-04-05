"use client";

import type { AppNotification } from "@/types";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { HeaderMenu } from "./HeaderMenu/HeaderMenu";
import styles from "./Header.module.css";

type Props = {
  userName: string | null;
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
  userName,
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

      <div className={styles.actions}>
        {userName && <span className={styles.userName}>Hi, {userName}</span>}
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
