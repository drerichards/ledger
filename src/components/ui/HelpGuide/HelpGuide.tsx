"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Modal } from "@/components/ui/Modal/Modal";
import styles from "./HelpGuide.module.css";

/**
 * Plain-language, indexed how-to guide for a non-technical user (Adriane).
 * An index of clickable chips jumps to each section; sections explain every
 * tab, how to add/edit/remove, and what the ⋯ row menu and features do. No
 * finance jargon, no app jargon. Opens in the shared Modal from the header.
 */

type Props = {
  onClose: () => void;
};

type Section = {
  id: string;
  chip: string; // short index label
  title: string;
  blocks: Array<{ heading?: string; body: string }>;
};

const SECTIONS: Section[] = [
  {
    id: "start",
    chip: "Start here",
    title: "What this app is for",
    blocks: [
      {
        body:
          "Ledger keeps every bill, paycheck, and savings note in one place so nothing sneaks up on you. Open it any time to see if you're okay this month. Nothing you tap can break it, and everything saves automatically.",
      },
      {
        heading: "Getting around",
        body:
          "The buttons along the top — Home, Accounts, Income, Payoff — switch between the four screens. Tap one to go there. The current screen is the highlighted one.",
      },
    ],
  },
  {
    id: "home",
    chip: "Home",
    title: "Home — your quick answer",
    blocks: [
      {
        body:
          "The big colored box gives you the one number that matters: how much is truly yours after every bill. Green means you're covered. Orange means you'll need to add money — the amount shown is the gap.",
      },
      {
        heading: "This week",
        body:
          "The row of days shows what's happening this week. Tap any day to see the bills due that day and how much you'll have left after.",
      },
      {
        heading: "This month's spending",
        body:
          "The ring breaks down where your money goes by category (housing, utilities, and so on). The three small gauges show how many bills you've handled, your next payoff, and savings progress. Tap the payoff gauge to jump to the Payoff screen.",
      },
    ],
  },
  {
    id: "accounts",
    chip: "Accounts",
    title: "Accounts — your bills",
    blocks: [
      {
        body:
          "This is the full list of bills, split into two groups: From Kia's Pay and From Other Income. Tap a group's dark header bar to fold it open or closed (one group always stays open).",
      },
      {
        heading: "Add a bill",
        body:
          'Tap "+ Add Bill" at the top. Fill in the payee name, amount, the day it\'s due, and whether it pays itself (Autopay) or you send it (Transfer). Save it and it appears in the list.',
      },
      {
        heading: "Edit or delete a bill",
        body:
          "On any bill row, tap the three dots ( ⋯ ) on the right. A small menu opens with Edit (change the name, amount, or due day) and Delete (remove it). You can also tap the Unpaid/Paid pill to mark a bill paid.",
      },
      {
        heading: "Recurring bills carry over",
        body:
          "Bills marked Recurring (the ↻ symbol) come back every month with their amount already filled in — you only adjust the ones that changed. Bills that aren't recurring you re-enter each month.",
      },
      {
        heading: "Moving between months",
        body:
          "Use the ‹ and › arrows by the month name to look at past or upcoming months. A new month fills in your recurring bills automatically.",
      },
    ],
  },
  {
    id: "income",
    chip: "Income",
    title: "Income — where each paycheck goes",
    blocks: [
      {
        body:
          "This screen tracks Kia's weekly checks and splits each one across your set categories (rent, savings, transfers, and so on). The PAY column is what's left after everything is set aside.",
      },
      {
        heading: "Add a week",
        body:
          'Tap the tip banner\'s "Add Week" button, or open a week and enter Kia\'s amount. The app fills in the rest of the row for you.',
      },
      {
        heading: "Fold months",
        body:
          "Each month has a header you can tap to fold its weeks away. At least one month always stays open.",
      },
      {
        heading: "The “More” button",
        body:
          "The More button (top right) opens two tools: Manage Payees lets you rename or add the columns each paycheck is split into (rent, savings, and so on); Paycheck Log shows the running history of every check entered.",
      },
    ],
  },
  {
    id: "payoff",
    chip: "Payoff",
    title: "Payoff — your payment plans",
    blocks: [
      {
        body:
          "Every installment plan shows one row, with a column per month so you can see the payments ahead. The last payment of each plan is marked, and the totals at the bottom show your monthly load and when everything is paid off.",
      },
      {
        heading: "Add or edit a plan",
        body:
          'Tap "+ Add Plan" to enter a new one (name, monthly amount, start and final month). To change or remove a plan, use the Edit and Delete buttons on its row. Finished plans no longer count toward your totals.',
      },
    ],
  },
  {
    id: "extras",
    chip: "Extras",
    title: "Handy extras",
    blocks: [
      {
        heading: "The calculator",
        body:
          "The round button floating on the screen is a calculator — tap it for quick math, and drag it anywhere comfortable.",
      },
      {
        heading: "If something looks off",
        body:
          "Nothing you tap will break anything. Close the app and open it again — your information is saved automatically. When in doubt, this guide is always here under the note icon at the top.",
      },
    ],
  },
];

export function HelpGuide({ onClose }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (typeof document === "undefined") return null;

  const active = SECTIONS[activeIndex];
  const isFirst = activeIndex === 0;
  const isLast = activeIndex === SECTIONS.length - 1;

  return createPortal(
    <Modal
      title="How to use Ledger"
      onClose={onClose}
      footer={
        <div className={styles.footerBar}>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
            disabled={isFirst}
          >
            ‹ Back
          </button>
          <span className={styles.pageCount}>
            {activeIndex + 1} of {SECTIONS.length}
          </span>
          {isLast ? (
            <button type="button" className={styles.gotIt} onClick={onClose}>
              Got it
            </button>
          ) : (
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => setActiveIndex((i) => Math.min(SECTIONS.length - 1, i + 1))}
            >
              Next ›
            </button>
          )}
        </div>
      }
    >
      <div className={styles.guide}>
        <nav className={styles.index} aria-label="Guide sections">
          {SECTIONS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`${styles.chip} ${i === activeIndex ? styles.chipActive : ""}`}
              aria-pressed={i === activeIndex}
              onClick={() => setActiveIndex(i)}
            >
              {s.chip}
            </button>
          ))}
        </nav>

        <section className={styles.section} aria-live="polite">
          <h4 className={styles.sectionTitle}>{active.title}</h4>
          {active.blocks.map((b, i) => (
            <div key={i} className={styles.block}>
              {b.heading && <p className={styles.blockHeading}>{b.heading}</p>}
              <p className={styles.sectionBody}>{b.body}</p>
            </div>
          ))}
        </section>
      </div>
    </Modal>,
    document.body,
  );
}
