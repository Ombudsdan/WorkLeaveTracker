import fs from "fs";
import path from "path";
import type { Database, AppUser, LeaveEntry, Company } from "@/types";

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

/**
 * Returns the KV REST API URL.
 * Supports both the standard Vercel KV env var name and the prefixed variant
 * that Vercel creates when a storage integration is named (e.g.
 * "LEAVE_TRACKER_STORAGE" → LEAVE_TRACKER_STORAGE_KV_REST_API_URL).
 */
function getKvUrl(): string | undefined {
  return process.env.KV_REST_API_URL ?? process.env.LEAVE_TRACKER_STORAGE_KV_REST_API_URL;
}

/**
 * Returns the KV REST API token.
 * Supports both the standard Vercel KV env var name and the prefixed variant.
 */
function getKvToken(): string | undefined {
  return process.env.KV_REST_API_TOKEN ?? process.env.LEAVE_TRACKER_STORAGE_KV_REST_API_TOKEN;
}

/** Returns true when Vercel KV is configured and should be used. */
function isKvEnabled(): boolean {
  return Boolean(getKvUrl() && getKvToken());
}

let cachedKvClient: import("@vercel/kv").VercelKV | null = null;

async function getKvClient(): Promise<import("@vercel/kv").VercelKV> {
  if (!cachedKvClient) {
    const url = getKvUrl();
    const token = getKvToken();
    if (!url || !token) {
      throw new Error(
        "Vercel KV is not configured: missing KV_REST_API_URL and KV_REST_API_TOKEN (or their LEAVE_TRACKER_STORAGE_ prefixed equivalents)"
      );
    }
    const { createClient } = await import("@vercel/kv");
    cachedKvClient = createClient({ url, token });
  }
  return cachedKvClient;
}

async function kvGet<T>(key: string): Promise<T | null> {
  return (await getKvClient()).get<T>(key);
}

async function kvSet(key: string, value: unknown): Promise<void> {
  await (await getKvClient()).set(key, value);
}

async function kvSadd(key: string, member: string): Promise<void> {
  await (await getKvClient()).sadd(key, member);
}

async function kvSmembers(key: string): Promise<string[]> {
  return (await (await getKvClient()).smembers(key)) as string[];
}

// ---------------------------------------------------------------------------
// Public API — all functions are async so callers work with both backends
// ---------------------------------------------------------------------------

export async function findUserByEmail(email: string): Promise<AppUser | undefined> {
  if (isKvEnabled()) {
    const id = await kvGet<string>(`email:${email}`);
    if (!id) return undefined;
    return (await kvGet<AppUser>(`user:${id}`)) ?? undefined;
  }
  return readDbFile().users.find((u) => u.profile.email === email);
}

export async function findUserById(id: string): Promise<AppUser | undefined> {
  if (isKvEnabled()) {
    return (await kvGet<AppUser>(`user:${id}`)) ?? undefined;
  }
  return readDbFile().users.find((u) => u.id === id);
}

export async function listAllUsers(): Promise<AppUser[]> {
  if (isKvEnabled()) {
    const ids = await kvSmembers("user_ids");
    const users = await Promise.all(ids.map((id) => kvGet<AppUser>(`user:${id}`)));
    return users.filter((u): u is AppUser => u !== null);
  }
  return readDbFile().users;
}

export async function updateUser(id: string, updates: Partial<AppUser>): Promise<AppUser | null> {
  if (isKvEnabled()) {
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
  if (isKvEnabled()) {
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
  if (isKvEnabled()) {
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
  if (isKvEnabled()) {
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
  if (isKvEnabled()) {
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

// ---------------------------------------------------------------------------
// Company registry
// ---------------------------------------------------------------------------

/** List all companies from the global registry. */
export async function listAllCompanies(): Promise<Company[]> {
  if (isKvEnabled()) {
    return (await kvGet<Company[]>("companies")) ?? [];
  }
  return readDbFile().companies ?? [];
}

/**
 * Find a company by name (case-insensitive).
 * Returns the matching Company or undefined if none is found.
 */
export async function findCompanyByName(name: string): Promise<Company | undefined> {
  const normalised = name.trim().toLowerCase();
  const companies = await listAllCompanies();
  return companies.find((c) => c.name.trim().toLowerCase() === normalised);
}

/**
 * Find or create a company with the given name.
 * If a company with this name already exists (case-insensitive) it is returned
 * unchanged. Otherwise a new company is created, persisted, and returned.
 */
export async function upsertCompany(name: string, id: string): Promise<Company> {
  const existing = await findCompanyByName(name);
  if (existing) return existing;
  const company: Company = { id, name: name.trim() };
  if (isKvEnabled()) {
    const companies = await listAllCompanies();
    companies.push(company);
    await kvSet("companies", companies);
  } else {
    const db = readDbFile();
    db.companies = db.companies ?? [];
    db.companies.push(company);
    writeDbFile(db);
  }
  return company;
}
