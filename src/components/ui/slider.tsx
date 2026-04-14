"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import styles from "./slider.module.css";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={[styles.root, className].filter(Boolean).join(" ")}
    {...props}
  >
    <SliderPrimitive.Track className={styles.track}>
      <SliderPrimitive.Range className={styles.range} />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className={styles.thumb} aria-label="Value" />
  </SliderPrimitive.Root>
));
Slider.displayName = "Slider";

export { Slider };
