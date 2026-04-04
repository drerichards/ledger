"use client";

import { type ReactNode } from "react";
import styles from "./Modal.module.css";

type Props = {
  title: string;
  onClose: () => void;
  /** Body content — rendered inside the scrollable modal body. */
  children: ReactNode;
  /** Footer content — rendered in the footer bar (buttons, etc.). */
  footer: ReactNode;
};

/**
 * Shared modal shell: backdrop, chrome, header, body, footer.
 *
 * Closing behaviour: clicking the backdrop or the × button calls onClose.
 * Body content is agnostic — pass a plain <form> or any node.
 *
 * For forms that need a submit button in the footer, use the HTML `form`
 * attribute to associate the button with the form without DOM nesting issues:
 *
 *   <Modal footer={<button type="submit" form="my-form">Save</button>}>
 *     <form id="my-form" onSubmit={...}>{fields}</form>
 *   </Modal>
 */
export function Modal({ title, onClose, children, footer }: Props) {
  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{title}</h3>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className={styles.modalBody}>{children}</div>

        <div className={styles.modalFooter}>{footer}</div>
      </div>
    </div>
  );
}
