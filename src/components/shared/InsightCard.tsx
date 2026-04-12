"use client";

import styles from "./InsightCard.module.css";

export type InsightProps = {
  icon?: string;
  headline: string;
  context?: string;
  teachingNote?: string;
  sentiment: "positive" | "neutral" | "warning" | "critical";
};

export function InsightCard({ icon, headline, context, teachingNote, sentiment }: InsightProps) {
  return (
    <div className={`${styles.card} ${styles[sentiment]}`}>
      {icon && <span className={styles.icon}>{icon}</span>}
      <div className={styles.body}>
        <p className={styles.headline}>{headline}</p>
        {context && <p className={styles.context}>{context}</p>}
        {teachingNote && <p className={styles.teaching}>{teachingNote}</p>}
      </div>
    </div>
  );
}
