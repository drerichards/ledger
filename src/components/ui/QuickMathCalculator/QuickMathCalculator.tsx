"use client";

import { useState } from "react";
import styles from "./QuickMathCalculator.module.css";

/**
 * Quick Math — a small four-function calculator for the Home screen.
 * Pure local state; does not touch app state. Logic ported from the
 * home-web design spec so behavior matches the mockup exactly.
 */

type Operator = "+" | "-" | "×" | "÷";

const compute = (a: number, b: number, op: Operator): number => {
  if (op === "+") return a + b;
  if (op === "-") return a - b;
  if (op === "×") return a * b;
  return b === 0 ? 0 : a / b;
};

export function QuickMathCalculator() {
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<Operator | null>(null);
  const [justEvaluated, setJustEvaluated] = useState(false);

  const input = (d: number) => {
    if (display === "0" || justEvaluated) {
      setDisplay(String(d));
      setJustEvaluated(false);
    } else {
      setDisplay(display + d);
    }
  };

  const dot = () => {
    if (justEvaluated) {
      setDisplay("0.");
      setJustEvaluated(false);
      return;
    }
    if (!display.includes(".")) setDisplay(display + ".");
  };

  const clear = () => {
    setDisplay("0");
    setPrev(null);
    setOp(null);
  };

  const setOperator = (nextOp: Operator) => {
    if (prev === null) {
      setPrev(parseFloat(display));
    } else if (op) {
      const v = compute(prev, parseFloat(display), op);
      setPrev(v);
      setDisplay(String(v));
    }
    setOp(nextOp);
    setJustEvaluated(true);
  };

  const equals = () => {
    if (op !== null && prev !== null) {
      const v = compute(prev, parseFloat(display), op);
      setDisplay(String(Number(v.toFixed(6))));
      setPrev(null);
      setOp(null);
      setJustEvaluated(true);
    }
  };

  const pct = () => setDisplay(String(parseFloat(display) / 100));
  const neg = () => setDisplay(String(parseFloat(display) * -1));

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.title}>Quick math</span>
        <span className={styles.hint}>{op ? `${prev} ${op}` : ""}</span>
      </div>
      <output className={styles.display}>{display}</output>
      <div className={styles.grid}>
        <button type="button" className={`${styles.btn} ${styles.util}`} onClick={clear}>C</button>
        <button type="button" className={`${styles.btn} ${styles.util}`} onClick={neg}>±</button>
        <button type="button" className={`${styles.btn} ${styles.util}`} onClick={pct}>%</button>
        <button type="button" className={`${styles.btn} ${styles.op}`} onClick={() => setOperator("÷")}>÷</button>

        <button type="button" className={styles.btn} onClick={() => input(7)}>7</button>
        <button type="button" className={styles.btn} onClick={() => input(8)}>8</button>
        <button type="button" className={styles.btn} onClick={() => input(9)}>9</button>
        <button type="button" className={`${styles.btn} ${styles.op}`} onClick={() => setOperator("×")}>×</button>

        <button type="button" className={styles.btn} onClick={() => input(4)}>4</button>
        <button type="button" className={styles.btn} onClick={() => input(5)}>5</button>
        <button type="button" className={styles.btn} onClick={() => input(6)}>6</button>
        <button type="button" className={`${styles.btn} ${styles.op}`} onClick={() => setOperator("-")}>−</button>

        <button type="button" className={styles.btn} onClick={() => input(1)}>1</button>
        <button type="button" className={styles.btn} onClick={() => input(2)}>2</button>
        <button type="button" className={styles.btn} onClick={() => input(3)}>3</button>
        <button type="button" className={`${styles.btn} ${styles.op}`} onClick={() => setOperator("+")}>+</button>

        <button type="button" className={`${styles.btn} ${styles.wide}`} onClick={() => input(0)}>0</button>
        <button type="button" className={styles.btn} onClick={dot}>.</button>
        <button type="button" className={`${styles.btn} ${styles.eq}`} onClick={equals}>=</button>
      </div>
    </div>
  );
}
