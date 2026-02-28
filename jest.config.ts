import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
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

export default createJestConfig(config);
