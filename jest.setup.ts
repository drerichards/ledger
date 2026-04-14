// Extends Jest's expect() with DOM matchers like toBeInTheDocument(), toHaveValue(), etc.
// Docs: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";

// Radix UI components (Slider, etc.) use ResizeObserver internally via @radix-ui/react-use-size.
// JSDOM doesn't ship ResizeObserver — stub it so component tests don't throw.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
