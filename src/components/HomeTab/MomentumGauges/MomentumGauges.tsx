"use client";

import { GaugeMeter } from "@/components/HomeTab/GaugeMeter";
import type { GaugeTone } from "@/components/HomeTab/GaugeMeter";
import styles from "./MomentumGauges.module.css";

/**
 * Momentum tile — three semicircular gauges (bills handled, next payoff, goal
 * progress) under a header. Replaces the older segmented MomentumCard on the
 * bento Home. HomeTab derives each gauge's value/tone from real data.
 */

export type GaugeData = {
  value: number;
  tone: GaugeTone;
  big: string;
  label: string;
  tag: string;
  onClick?: () => void;
};

type Props = {
  gauges: [GaugeData, GaugeData, GaugeData];
};

export function MomentumGauges({ gauges }: Props) {
  return (
    <div className={styles.mom}>
      <div className={styles.head}>
        <p className={styles.title}>Momentum</p>
        <p className={styles.meta}>How you&apos;re trending</p>
      </div>
      <div className={styles.row}>
        {gauges.map((g) => (
          <GaugeMeter
            key={g.label}
            value={g.value}
            tone={g.tone}
            big={g.big}
            label={g.label}
            tag={g.tag}
            onClick={g.onClick}
          />
        ))}
      </div>
    </div>
  );
}
