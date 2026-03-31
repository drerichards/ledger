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
  ],

  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

// next/jest wraps config to handle transforms, CSS Modules, image mocks, ESM packages
module.exports = createJestConfig(config);
