"use client";

import { GoogleIcon } from "@/components/icons/GoogleIcon";
import { useGoogleSignIn } from "@/hooks/useGoogleSignIn";
import styles from "./Login.module.css";

export default function LoginPage() {
  const { loading, errorMsg, signIn } = useGoogleSignIn();

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoMark}>L</div>
        <h1 className={styles.title}>Ledger</h1>
        <p className={styles.subtitle}>Household bill tracker</p>

        {errorMsg && <p className={styles.errorMsg}>{errorMsg}</p>}

        <button
          className={styles.googleBtn}
          onClick={signIn}
          disabled={loading}
        >
          <GoogleIcon className={styles.googleIcon} />
          {loading ? "Redirecting…" : "Sign in with Google"}
        </button>
      </div>
    </div>
  );
}
