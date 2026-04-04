import { type ReactNode } from "react";
import styles from "./FormField.module.css";

type Props = {
  /** Must match the `id` of the child input/select/textarea for a11y. */
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
};

/**
 * Shared form field wrapper: label → input slot → optional inline error.
 *
 * The caller owns the input element — this component only provides
 * the structural chrome (label + error message) so the field is not
 * opinionated about input type, registration, or validation strategy.
 *
 * Usage:
 *   <FormField id="bill-name" label="Payee Name" error={errors.name?.message}>
 *     <input id="bill-name" className={styles.input} {...register("name")} />
 *   </FormField>
 */
export function FormField({ id, label, error, children }: Props) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {children}
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
