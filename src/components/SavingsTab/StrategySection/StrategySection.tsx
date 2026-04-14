import styles from "./StrategySection.module.css";

const STEPS = [
  {
    n: 1,
    variant: "olive" as const,
    title: "Pay yourself first — before bills",
    body: "When Kia's check lands, move a fixed amount to savings before paying anything. Even $20/week compounds to $1,040/year — with nothing left to accidentally spend.",
  },
  {
    n: 2,
    variant: "olive" as const,
    title: "Don't wait — route $50 of that surplus right now",
    body: "You already have surplus not going anywhere. Move $50 of it to Emergency Fund today. That's $600 by October while Affirm is still active.",
  },
  {
    n: 3,
    variant: "navy" as const,
    title: "Redirect Affirm payments the day they clear",
    body: "Set a calendar reminder now. The moment that monthly payment stops, route it straight to savings before your budget absorbs it as extra spending money.",
  },
  {
    n: 4,
    variant: "navy" as const,
    title: "Once your emergency fund is full, try index funds",
    body: "Index funds (like VOO or VTI) invest in hundreds of companies at once. They've averaged ~10%/year historically — far better than any savings account. Start with $25/mo on Fidelity or Schwab.",
  },
];

const ACCOUNTS = [
  {
    label: "✦ High-Yield Savings (HYSA)",
    body: "4–5% APY. Your money earns interest while it sits. Best for emergency fund. Marcus, Ally, SoFi are all free to open.",
    variant: "olive" as const,
  },
  {
    label: "Regular Savings",
    body: "Where you are now. Earns ~0.01% APY. Fine for holding cash, but your money isn't growing.",
    variant: "navy" as const,
  },
  {
    label: "CDs (Certificates of Deposit)",
    body: "Lock money for 6–12 months at ~5%. Good once you have a 3-month buffer locked in a HYSA first.",
    variant: "gold" as const,
  },
  {
    label: "⚠ Checking Account",
    body: "Too easy to spend. Separate account = psychological barrier = meaningfully higher savings rate over time.",
    variant: "rust" as const,
  },
  {
    label: "📈 Index Funds (Brokerage)",
    body: "Best long-term growth (~10%/yr avg). Not for money you'll need in under 2 years — for your future self. Start with $25/mo after your emergency fund is solid.",
    variant: "navy" as const,
  },
];

export function StrategySection() {
  return (
    <div className={styles.container}>
      <p className={styles.sectionLabel}>Savings Strategy</p>

      <div className={styles.steps}>
        {STEPS.map((s) => (
          <div key={s.n} className={styles.step}>
            <div className={`${styles.stepNum} ${styles[`stepNum_${s.variant}`]}`}>
              {s.n}
            </div>
            <div>
              <p className={styles.stepTitle}>{s.title}</p>
              <p className={styles.stepBody}>{s.body}</p>
            </div>
          </div>
        ))}
      </div>

      <p className={styles.sectionLabel}>Where to Put It</p>

      <div className={styles.accountGrid}>
        {ACCOUNTS.map((a) => (
          <div key={a.label} className={`${styles.accountCard} ${styles[`account_${a.variant}`]}`}>
            <p className={styles.accountLabel}>{a.label}</p>
            <p className={styles.accountBody}>{a.body}</p>
          </div>
        ))}
      </div>

      <div className={styles.aiCard}>
        <span className={styles.aiEmoji}>🤖</span>
        <div>
          <p className={styles.aiTitle}>
            Ask Ledger
            <span className={styles.aiBadge}>Coming Soon</span>
          </p>
          <p className={styles.aiBody}>
            AI that reads your actual numbers and tells you what to do next.{" "}
            <em>
              &ldquo;You have surplus this week — here&apos;s exactly where I&apos;d put it
              based on your goals.&rdquo;
            </em>
          </p>
        </div>
      </div>
    </div>
  );
}
