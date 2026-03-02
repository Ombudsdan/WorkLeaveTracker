import fs from "fs";
import path from "path";
import type { Database, AppUser, LeaveEntry } from "@/types";

// ---------------------------------------------------------------------------
// File-based storage (local development fallback)
// ---------------------------------------------------------------------------

const DB_PATH = path.join(process.cwd(), "data", "data.json");
const EXAMPLE_PATH = path.join(process.cwd(), "data", "data.example.json");

/**
 * Ensures data.json exists on first run by copying data.example.json.
 * This allows data.json to be gitignored while still providing a working
 * default state when the repo is freshly cloned.
 */
function ensureDbExists(): void {
  if (!fs.existsSync(DB_PATH)) {
    if (fs.existsSync(EXAMPLE_PATH)) {
      fs.copyFileSync(EXAMPLE_PATH, DB_PATH);
    } else {
      fs.writeFileSync(DB_PATH, JSON.stringify({ users: [] }, null, 2), "utf-8");
    }
  }
}

function readDbFile(): Database {
  ensureDbExists();
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(raw) as Database;
}

function writeDbFile(db: Database): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------
// Vercel KV helpers
// ---------------------------------------------------------------------------
// KV key layout:
//   user:{id}          → AppUser JSON          (one key per user)
//   email:{email}      → user id string        (email → id index)
//   user_ids           → Redis SET of all ids  (for listing all users)

/** Returns true when Vercel KV is configured and should be used. */
function useKv(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function kvGet<T>(key: string): Promise<T | null> {
  const { kv } = await import("@vercel/kv");
  return kv.get<T>(key);
}

async function kvSet(key: string, value: unknown): Promise<void> {
  const { kv } = await import("@vercel/kv");
  await kv.set(key, value);
}

async function kvSadd(key: string, member: string): Promise<void> {
  const { kv } = await import("@vercel/kv");
  await kv.sadd(key, member);
}

async function kvSmembers(key: string): Promise<string[]> {
  const { kv } = await import("@vercel/kv");
  return (await kv.smembers(key)) as string[];
}

// ---------------------------------------------------------------------------
// Public API — all functions are async so callers work with both backends
// ---------------------------------------------------------------------------

export async function findUserByEmail(email: string): Promise<AppUser | undefined> {
  if (useKv()) {
    const id = await kvGet<string>(`email:${email}`);
    if (!id) return undefined;
    return (await kvGet<AppUser>(`user:${id}`)) ?? undefined;
  }
  return readDbFile().users.find((u) => u.profile.email === email);
}

export async function findUserById(id: string): Promise<AppUser | undefined> {
  if (useKv()) {
    return (await kvGet<AppUser>(`user:${id}`)) ?? undefined;
  }
  return readDbFile().users.find((u) => u.id === id);
}

export async function listAllUsers(): Promise<AppUser[]> {
  if (useKv()) {
    const ids = await kvSmembers("user_ids");
    const users = await Promise.all(ids.map((id) => kvGet<AppUser>(`user:${id}`)));
    return users.filter((u): u is AppUser => u !== null);
  }
  return readDbFile().users;
}

export async function updateUser(id: string, updates: Partial<AppUser>): Promise<AppUser | null> {
  if (useKv()) {
    const existing = await kvGet<AppUser>(`user:${id}`);
    if (!existing) return null;
    const updated: AppUser = { ...existing, ...updates };
    await kvSet(`user:${id}`, updated);
    return updated;
  }
  const db = readDbFile();
  const idx = db.users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  db.users[idx] = { ...db.users[idx], ...updates };
  writeDbFile(db);
  return db.users[idx];
}

export async function addUser(user: AppUser): Promise<void> {
  if (useKv()) {
    await kvSet(`user:${user.id}`, user);
    await kvSet(`email:${user.profile.email}`, user.id);
    await kvSadd("user_ids", user.id);
    return;
  }
  const db = readDbFile();
  db.users.push(user);
  writeDbFile(db);
}

export async function addEntry(userId: string, entry: LeaveEntry): Promise<boolean> {
  if (useKv()) {
    const user = await kvGet<AppUser>(`user:${userId}`);
    if (!user) return false;
    user.entries.push(entry);
    await kvSet(`user:${userId}`, user);
    return true;
  }
  const db = readDbFile();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return false;
  user.entries.push(entry);
  writeDbFile(db);
  return true;
}

export async function updateEntry(
  userId: string,
  entryId: string,
  updates: Partial<LeaveEntry>
): Promise<boolean> {
  if (useKv()) {
    const user = await kvGet<AppUser>(`user:${userId}`);
    if (!user) return false;
    const idx = user.entries.findIndex((e) => e.id === entryId);
    if (idx === -1) return false;
    user.entries[idx] = { ...user.entries[idx], ...updates };
    await kvSet(`user:${userId}`, user);
    return true;
  }
  const db = readDbFile();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return false;
  const idx = user.entries.findIndex((e) => e.id === entryId);
  if (idx === -1) return false;
  user.entries[idx] = { ...user.entries[idx], ...updates };
  writeDbFile(db);
  return true;
}

export async function deleteEntry(userId: string, entryId: string): Promise<boolean> {
  if (useKv()) {
    const user = await kvGet<AppUser>(`user:${userId}`);
    if (!user) return false;
    const before = user.entries.length;
    user.entries = user.entries.filter((e) => e.id !== entryId);
    if (user.entries.length === before) return false;
    await kvSet(`user:${userId}`, user);
    return true;
  }
  const db = readDbFile();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return false;
  const before = user.entries.length;
  user.entries = user.entries.filter((e) => e.id !== entryId);
  if (user.entries.length === before) return false;
  writeDbFile(db);
  return true;
}
