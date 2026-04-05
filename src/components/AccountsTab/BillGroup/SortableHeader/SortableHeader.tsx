import type { SortKey, SortDir } from "../BillGroup";
import styles from "../BillGroup.module.css";

type Props = {
  label: string;
  sortKey: SortKey;
  activeSortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  alignRight?: boolean;
};

export function SortableHeader({
  label,
  sortKey,
  activeSortKey,
  sortDir,
  onSort,
  alignRight = false,
}: Props) {
  const isActive = activeSortKey === sortKey;
  return (
    <th
      scope="col"
      className={`${styles.th} ${styles.thSortable} ${alignRight ? styles.thRight : ""}`}
      onClick={() => onSort(sortKey)}
      aria-sort={isActive ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
    >
      {label} {isActive ? (sortDir === "asc" ? "↑" : "↓") : ""}
    </th>
  );
}
