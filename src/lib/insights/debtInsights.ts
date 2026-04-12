import type { InsightProps } from "@/components/shared/InsightCard";
import { fmtMoney } from "@/lib/money/money";
import { fmtMonthLabel } from "@/lib/dates/dates";

type MonthRow = {
  month: string;
  owed: number;
  relief: number;
  isFinal: boolean;
};

export function affirmPayoffInsights(rows: MonthRow[]): InsightProps[] {
  const insights: InsightProps[] = [];

  // Find the next step-down (first future month where relief > 0)
  const nextStepDown = rows.find((r) => r.relief > 0 && !r.isFinal);
  if (nextStepDown) {
    insights.push({
      icon: "📉",
      headline: `${fmtMoney(nextStepDown.relief)}/mo freed up in ${fmtMonthLabel(nextStepDown.month)}.`,
      context: `Monthly Affirm obligation drops from ${fmtMoney(nextStepDown.owed + nextStepDown.relief)} to ${fmtMoney(nextStepDown.owed)}.`,
      teachingNote:
        "When a monthly payment disappears, that money can go straight to savings — this is called the debt snowball effect.",
      sentiment: "positive",
    });
  }

  // Find the final payoff month
  const finalRow = rows.find((r) => r.isFinal);
  if (finalRow) {
    const monthsAway = rows.indexOf(finalRow);
    insights.push({
      icon: "🎉",
      headline: `All Affirm plans paid off by ${fmtMonthLabel(finalRow.month)}.`,
      context:
        monthsAway === 0
          ? "You're debt-free from Affirm this month."
          : `${monthsAway} month${monthsAway !== 1 ? "s" : ""} until you're completely free.`,
      teachingNote:
        "Paying off installment debt improves your credit utilization ratio and frees cash flow for building wealth.",
      sentiment: monthsAway <= 3 ? "positive" : "neutral",
    });
  }

  // Only show the highest-signal insight (step-down > payoff unless payoff is this month)
  if (insights.length > 1 && finalRow && rows.indexOf(finalRow) === 0) {
    return [insights[1]]; // payoff is now, skip step-down
  }

  return insights.slice(0, 2);
}
