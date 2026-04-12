"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { CHART_COLORS } from "@/lib/chartTokens";
import { fmtMoney } from "@/lib/money/money";
import { fmtMonthLabel } from "@/lib/dates/dates";
import { FinanceTooltip } from "@/components/shared/FinanceTooltip";

type DataPoint = {
  month: string;
  owed: number;
  isStep: boolean;
};

type Props = {
  data: DataPoint[];
};

export function AffirmBurdenChart({ data }: Props) {
  // Step-down months get a reference line so the drop is visually flagged
  const stepDownMonths = data.filter((d) => d.isStep).map((d) => d.month);

  const formatXTick = (month: string) => {
    // Show abbreviated label — "Jan '26" style
    const label = fmtMonthLabel(month); // e.g. "January 2026"
    const parts = label.split(" ");
    return `${parts[0].slice(0, 3)} '${parts[1].slice(2)}`;
  };

  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="affirmBurden" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={CHART_COLORS.rust} stopOpacity={0.18} />
            <stop offset="95%" stopColor={CHART_COLORS.rust} stopOpacity={0.03} />
          </linearGradient>
        </defs>

        <CartesianGrid
          stroke={CHART_COLORS.border}
          strokeDasharray="3 3"
          vertical={false}
        />

        <XAxis
          dataKey="month"
          tickFormatter={formatXTick}
          tick={{ fontSize: 10, fill: CHART_COLORS.textMid, fontFamily: "var(--font-primary)" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />

        <YAxis
          tickFormatter={(v) => fmtMoney(v)}
          tick={{ fontSize: 10, fill: CHART_COLORS.textMid, fontFamily: "var(--font-mono)" }}
          axisLine={false}
          tickLine={false}
          width={60}
        />

        <Tooltip
          content={
            <FinanceTooltip
              fmtValue={fmtMoney}
            />
          }
        />

        {/* Vertical marker on each step-down month */}
        {stepDownMonths.map((month) => (
          <ReferenceLine
            key={month}
            x={month}
            stroke={CHART_COLORS.olive}
            strokeDasharray="3 3"
            strokeWidth={1.5}
          />
        ))}

        <Area
          type="stepAfter"
          dataKey="owed"
          name="Monthly burden"
          stroke={CHART_COLORS.rust}
          strokeWidth={2}
          fill="url(#affirmBurden)"
          dot={false}
          activeDot={{ r: 4, fill: CHART_COLORS.rust, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
