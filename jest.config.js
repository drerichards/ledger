const nextJest = require("next/jest.js");

const createJestConfig = nextJest({
  // Points to your Next.js app root so next/jest reads next.config.ts + .env files
  dir: "./",
});

/** @type {import('jest').Config} */
const config = {
  // Simulate a browser environment — needed for any code that touches the DOM
  testEnvironment: "jest-environment-jsdom",

  // Runs after Jest is installed into the environment — imports jest-dom matchers
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],

  // Mirror tsconfig.json path aliases so @/lib/money resolves correctly in tests
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },

  // Collect tests from __tests__ directories or *.test.ts(x) files
  testMatch: [
    "**/__tests__/**/*.[jt]s?(x)",
    "**/?(*.)+(spec|test).[jt]s?(x)",
  ],

  // Playwright E2E lives in /e2e — run separately via pnpm test:e2e
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/.next/",
    "<rootDir>/e2e/",
  ],

  // Coverage targets the pure business logic — lib/ and hooks/ are highest priority
  collectCoverageFrom: [
    "src/lib/**/*.{ts,tsx}",
    "src/hooks/**/*.{ts,tsx}",
    "src/components/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.module.css",
    // Auth/DB infrastructure — requires Supabase env vars, cannot be unit tested
    "!src/lib/supabase/**",
    // Shadcn/Radix generated UI primitives — not project business logic
    "!src/components/ui/alert-dialog.tsx",
    "!src/components/ui/badge.tsx",
    "!src/components/ui/button.tsx",
    "!src/components/ui/card.tsx",
    "!src/components/ui/dialog.tsx",
    "!src/components/ui/input.tsx",
    "!src/components/ui/label.tsx",
    "!src/components/ui/select.tsx",
    "!src/components/ui/separator.tsx",
    "!src/components/ui/table.tsx",
  ],

  // Exclude node_modules and all index.ts barrel files (pure re-exports, no logic).
  // Note: strings here are regex patterns matched against the full file path —
  // no surrounding slashes. "/index\\.ts$/" was wrong; it looked for a literal
  // trailing slash after the extension and never matched anything.
  coveragePathIgnorePatterns: ["/node_modules/", "index\\.ts$"],

  // Production regression guard.
  //
  // Thresholds are set at the current measured floor, not a round number.
  // Any PR that drops coverage below these values fails CI and requires a
  // decision: either write the missing test, or add an `// istanbul ignore`
  // comment to the source with an explanation of why the branch/line cannot
  // be meaningfully tested. Lowering these numbers is never the right fix.
  //
  // To raise a threshold: improve coverage first, then update the number.
  // Last measured: 2026-04-05 (94.2% stmts / 90.3% branch / 94.5% funcs / 96.5% lines)
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 94,
      lines: 96,
      statements: 94,
    },
  },
};

// next/jest wraps config to handle transforms, CSS Modules, image mocks, ESM packages
module.exports = createJestConfig(config);
