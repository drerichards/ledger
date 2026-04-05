import styles from "./Stat.module.css";

type Props = {
  label: string;
  value: string;
  color?: "rust" | "olive";
  compact?: boolean;
};

export function Stat({ label, value, color, compact }: Props) {
  return (
    <div className={`${styles.stat} ${compact ? styles.compact : ""}`}>
      <span className={styles.label}>{label}</span>
      <span className={`${styles.value} ${color ? styles[color] : ""}`}>
        {value}
      </span>
    </div>
  );
}
