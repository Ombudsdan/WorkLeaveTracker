import fs from "fs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "data.json");
const EXAMPLE_PATH = path.join(process.cwd(), "data", "data.example.json");

/**
 * Reset the JSON database to the example seed data.
 * Call this in `test.beforeEach` or `test.beforeAll` to guarantee a clean,
 * predictable starting state for each test.
 */
export function resetDb(): void {
  fs.copyFileSync(EXAMPLE_PATH, DB_PATH);
}

/**
 * Seed credentials that match the hashed passwords in data.example.json.
 * Both users share the same password for simplicity.
 */
export const ALICE = { email: "alice@example.com", password: "password123" };
export const BOB = { email: "bob@example.com", password: "password123" };
