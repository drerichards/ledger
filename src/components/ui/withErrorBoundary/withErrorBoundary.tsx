"use client";

import React from "react";
import styles from "./withErrorBoundary.module.css";

type State = { hasError: boolean; message: string };

class ErrorBoundary extends React.Component<
  { name: string; children: React.ReactNode },
  State
> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.fallback}>
          <strong>{this.props.name} failed to render.</strong>
          <pre className={styles.message}>{this.state.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * HOC — wraps a tab component in an error boundary so one crashing tab
 * cannot take down the entire shell.
 *
 * Usage: export default withErrorBoundary(MyTab, "MyTab");
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  displayName: string,
) {
  function WrappedComponent(props: P) {
    return (
      <ErrorBoundary name={displayName}>
        <Component {...props} />
      </ErrorBoundary>
    );
  }
  WrappedComponent.displayName = `withErrorBoundary(${displayName})`;
  return WrappedComponent;
}
