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

type Block = {
  heading?: string;
  body: string;
  screenshot?: string;
};

type Section = {
  id: string;
  chip: string; // short index label
  title: string;
  screenshot?: string;
  blocks: Block[];
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
    screenshot: "/screenshots/home-tab.png",
    blocks: [
      {
        body:
          "The green or orange card in the top-left (labeled 'THE ANSWER') shows your estimated budget surplus or gap. It is calculated by taking your total income for the month (your fixed military, retirement, and Social Security checks plus Kia's check projections) and subtracting the total cost of all monthly bills.",
        screenshot: "/screenshots/verdict-card.png",
      },
      {
        heading: "This week",
        body:
          "The 'This week' section on the right shows a 7-day calendar rail. Below the days, you see the bills due on the selected day and the projected cash balance remaining in your checking account after those specific bills clear.",
        screenshot: "/screenshots/this-week.png",
      },
      {
        heading: "This month's spending",
        body:
          "The category ring breaks down your total bills by type (housing, utilities, transfers). The three gauges at the bottom track the number of bills you have marked paid, your upcoming Affirm installment payment total, and your progress toward savings goals. Tap the Affirm gauge to switch to the Payoff screen.",
        screenshot: "/screenshots/momentum-gauges.png",
      },
    ],
  },
  {
    id: "accounts",
    chip: "Accounts",
    title: "Accounts — your bills",
    screenshot: "/screenshots/accounts-tab.png",
    blocks: [
      {
        body:
          "This is the full list of bills, split into two groups: From Kia's Pay and From Other Income. Tap a group's dark header bar to fold it open or closed (one group always stays open).",
      },
      {
        heading: "Add a bill",
        body:
          'Tap "+ Add Bill" at the top. Fill in the payee name, amount, the day it\'s due, and whether it pays itself (Autopay) or you send it (Transfer). Save it and it appears in the list.',
        screenshot: "/screenshots/add-bill-modal.png",
      },
      {
        heading: "Edit or delete a bill",
        body:
          "On any bill row, tap the three dots ( ⋯ ) on the right. A small menu opens with Edit (change the name, amount, or due day) and Delete (remove it). You can also tap the Unpaid/Paid pill to mark a bill paid.",
        screenshot: "/screenshots/edit-delete-menu.png",
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
    screenshot: "/screenshots/income-tab.png",
    blocks: [
      {
        body:
          "This screen tracks Kia's weekly checks and splits each one across your set categories (rent, savings, transfers, and so on). The PAY column is what's left after everything is set aside.",
        screenshot: "/screenshots/income-splitting.png",
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
    screenshot: "/screenshots/payoff-tab.png",
    blocks: [
      {
        body:
          "Every installment plan shows one row, with a column per month so you can see the payments ahead. The last payment of each plan is marked, and the totals at the bottom show your monthly load and when everything is paid off.",
      },
      {
        heading: "Add or edit a plan",
        body:
          'Tap "+ Add Plan" to enter a new one (name, monthly amount, start and final month). To change or remove a plan, use the Edit and Delete buttons on its row. Finished plans no longer count toward your totals.',
        screenshot: "/screenshots/add-plan-modal.png",
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
      size="xl"
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
          {active.screenshot && (
            <div className={styles.screenshotWrap}>
              <a
                href={active.screenshot}
                target="_blank"
                rel="noopener noreferrer"
                title="Click to view full size in new tab"
                className={styles.screenshotLink}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={active.screenshot}
                  alt={`${active.title} Screenshot`}
                  className={styles.screenshot}
                />
              </a>
            </div>
          )}
          {active.blocks.map((b, i) => (
            <div key={i} className={styles.block}>
              {b.heading && <p className={styles.blockHeading}>{b.heading}</p>}
              <p className={styles.sectionBody}>{b.body}</p>
              {b.screenshot && (
                <div className={styles.screenshotWrap}>
                  <a
                    href={b.screenshot}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Click to view full size in new tab"
                    className={styles.screenshotLink}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={b.screenshot}
                      alt={`${b.heading || active.title} Screenshot`}
                      className={styles.screenshot}
                    />
                  </a>
                </div>
              )}
            </div>
          ))}
        </section>
      </div>
    </Modal>,
    document.body,
  );
}
