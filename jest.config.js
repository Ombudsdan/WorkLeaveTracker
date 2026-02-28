const nextJest = require("next/jest.js");

const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  collectCoverage: true,
  coverageProvider: "v8",
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "clover"],
  collectCoverageFrom: [
    "utils/**/*.ts",
    "lib/leaveCalc.ts",
    "variables/**/*.ts",
    "controllers/**/*.ts",
    "contexts/**/*.tsx",
    "components/**/*.tsx",
    "types/index.ts",
    "!components/Providers.tsx",
  ],
  coverageThreshold: {
    global: {
      branches: 99,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
};

module.exports = createJestConfig(config);
