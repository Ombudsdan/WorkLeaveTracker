import fs from "fs";
import path from "path";
import type { Database, AppUser, LeaveEntry } from "@/types";

const DB_PATH = path.join(process.cwd(), "data", "data.json");

export function readDb(): Database {
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(raw) as Database;
}

export function writeDb(db: Database): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

export function findUserByEmail(email: string): AppUser | undefined {
  const db = readDb();
  return db.users.find((u) => u.profile.email === email);
}

export function findUserById(id: string): AppUser | undefined {
  const db = readDb();
  return db.users.find((u) => u.id === id);
}

export function updateUser(id: string, updates: Partial<AppUser>): AppUser | null {
  const db = readDb();
  const idx = db.users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  db.users[idx] = { ...db.users[idx], ...updates };
  writeDb(db);
  return db.users[idx];
}

export function addEntry(userId: string, entry: LeaveEntry): boolean {
  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return false;
  user.entries.push(entry);
  writeDb(db);
  return true;
}

export function updateEntry(
  userId: string,
  entryId: string,
  updates: Partial<LeaveEntry>
): boolean {
  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return false;
  const idx = user.entries.findIndex((e) => e.id === entryId);
  if (idx === -1) return false;
  user.entries[idx] = { ...user.entries[idx], ...updates };
  writeDb(db);
  return true;
}

export function deleteEntry(userId: string, entryId: string): boolean {
  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return false;
  const before = user.entries.length;
  user.entries = user.entries.filter((e) => e.id !== entryId);
  if (user.entries.length === before) return false;
  writeDb(db);
  return true;
}
