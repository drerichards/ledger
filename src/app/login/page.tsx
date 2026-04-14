"use client";

import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { useGoogleSignIn } from "@/hooks/useGoogleSignIn";
import styles from "./Login.module.css";

export default function LoginPage() {
  const { loading, errorMsg, signIn } = useGoogleSignIn();

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandName}>Ledger</span>
          <span className={styles.brandSub}>Household Finance Tracker</span>
        </div>

        {errorMsg && <p className={styles.errorMsg}>{errorMsg}</p>}

        <button
          className={styles.googleBtn}
          onClick={signIn}
          disabled={loading}
        >
          <GoogleIcon className={styles.googleIcon} />
          {loading ? "Redirecting…" : "Sign in with Google"}
        </button>

        <p className={styles.footer}>Household access only</p>
      </div>
    </div>
  );
}
