"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import styles from "./progress.module.css";

type ProgressProps = React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
  /** Color variant matching the app's token palette */
  variant?: "olive" | "rust" | "gold" | "navy";
};

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, variant = "olive", ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={[styles.track, className].filter(Boolean).join(" ")}
    value={value}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={[styles.fill, styles[variant]].join(" ")}
      style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = "Progress";

export { Progress };
