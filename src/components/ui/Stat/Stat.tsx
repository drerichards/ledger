import styles from "./Stat.module.css";

type Props = {
  label: string;
  value: string;
  color?: "rust" | "olive";
};

export function Stat({ label, value, color }: Props) {
  return (
    <div className={styles.stat}>
      <span className={styles.label}>{label}</span>
      <span className={`${styles.value} ${color ? styles[color] : ""}`}>
        {value}
      </span>
    </div>
  );
}
