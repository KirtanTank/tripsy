import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * One cache in front of every outside API, so a repeat of a recent question never costs another call.
 * - Memory first, then a shared store, so answers survive a server restart:
 *   Redis (Upstash REST) when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set, else a JSON file per entry on disk.
 *   Redis is the one to use on serverless hosts, where each instance has its own short-lived disk.
 * - Identical requests that arrive together share one call instead of each making their own.
 * - Results a caller marks as not worth keeping (failures) aren't stored; an older good answer is served instead.
 * Set CACHE_DIR to move the files. Delete the folder (or the tripsy:* Redis keys) to clear everything.
 */
const DIR = process.env.CACHE_DIR || path.join(process.cwd(), ".cache", "api");
const MAX_MEMORY = 1000;
/** Redis keeps entries this long past their TTL, so an expired answer can still stand in when a fresh call fails. */
const STALE_GRACE = 7 * 24 * 60 * 60;

type Entry<T> = { at: number; ttl: number; value: T };
type Store = { mem: Map<string, Entry<unknown>>; inflight: Map<string, Promise<unknown>>; stats: Record<string, { hit: number; miss: number }> };

// Kept on globalThis so dev-mode hot reloads don't wipe it.
const g = globalThis as typeof globalThis & { __tripsyCache?: Store };
const store: Store = (g.__tripsyCache ??= { mem: new Map(), inflight: new Map(), stats: {} });

export const cacheKey = (parts: unknown) => createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 32);
const fileOf = (ns: string, key: string) => path.join(DIR, ns, `${key}.json`);

// Vercel's Upstash integration names the variables KV_REST_API_*, so those work too.
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

async function redis<T>(command: (string | number)[]): Promise<T> {
  const res = await fetch(REDIS_URL!, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
    signal: AbortSignal.timeout(3000),
  });
  const j = (await res.json()) as { result?: T; error?: string };
  if (!res.ok || j.error) throw new Error(j.error || `Redis ${res.status}`);
  return j.result as T;
}

/** The store behind memory: Redis when configured, else disk. Both are best-effort; memory still works without them. */
const shared = REDIS_URL && REDIS_TOKEN
  ? {
      async get<T>(ns: string, key: string) {
        const raw = await redis<string | null>(["GET", `tripsy:${ns}:${key}`]);
        return raw ? (JSON.parse(raw) as Entry<T>) : null;
      },
      async set(ns: string, key: string, e: Entry<unknown>) {
        await redis(["SET", `tripsy:${ns}:${key}`, JSON.stringify(e), "EX", Math.ceil(e.ttl + STALE_GRACE)]);
      },
    }
  : {
      async get<T>(ns: string, key: string) {
        return JSON.parse(await readFile(fileOf(ns, key), "utf8")) as Entry<T>;
      },
      async set(ns: string, key: string, e: Entry<unknown>) {
        await mkdir(path.join(DIR, ns), { recursive: true });
        await writeFile(fileOf(ns, key), JSON.stringify(e));
      },
    };

function count(ns: string, hit: boolean) {
  const s = (store.stats[ns] ??= { hit: 0, miss: 0 });
  if (hit) s.hit++;
  else s.miss++;
}

async function read<T>(ns: string, key: string): Promise<Entry<T> | null> {
  const id = `${ns}:${key}`;
  const m = store.mem.get(id) as Entry<T> | undefined;
  if (m) return m;
  try {
    const e = await shared.get<T>(ns, key);
    if (e) remember(id, e);
    return e;
  } catch {
    return null;
  }
}

function remember(id: string, e: Entry<unknown>) {
  store.mem.delete(id);
  store.mem.set(id, e);
  if (store.mem.size > MAX_MEMORY) store.mem.delete(store.mem.keys().next().value!);
}

/** Stores a value for `ttl` seconds. */
export async function put<T>(ns: string, key: string, value: T, ttl: number) {
  const e: Entry<T> = { at: Date.now(), ttl, value };
  remember(`${ns}:${key}`, e);
  try {
    await shared.set(ns, key, e);
  } catch {
    /* the shared store is optional: memory still works */
  }
}

/** A stored value that hasn't expired, without calling anything. */
export async function peek<T>(ns: string, key: string): Promise<{ value: T; at: number } | null> {
  const e = await read<T>(ns, key);
  const ok = !!e && Date.now() - e.at < e.ttl * 1000;
  count(ns, ok);
  return ok ? { value: e!.value, at: e!.at } : null;
}

type Options<T> = {
  /** Skip a stored answer, as long as it's at least `minAge` seconds old (stops refresh-button spam). */
  fresh?: boolean;
  minAge?: number;
  /** Whether a result is worth storing. Defaults to everything. */
  keep?: (value: T) => boolean;
};

/**
 * Returns the stored answer for `parts` if it's younger than `ttl` seconds, otherwise calls `fn` and stores the result.
 * `hit` says whether the outside API was skipped.
 */
export async function cached<T>(ns: string, parts: unknown, ttl: number, fn: () => Promise<T>, opts: Options<T> = {}): Promise<{ value: T; hit: boolean; at: number }> {
  const key = cacheKey(parts);
  const id = `${ns}:${key}`;
  const old = await read<T>(ns, key);
  const age = old ? (Date.now() - old.at) / 1000 : Infinity;
  if (old && age < ttl && (!opts.fresh || age < (opts.minAge ?? 0))) {
    count(ns, true);
    return { value: old.value, hit: true, at: old.at };
  }

  count(ns, false);
  let job = store.inflight.get(id) as Promise<T> | undefined;
  if (!job) {
    job = fn().finally(() => store.inflight.delete(id));
    store.inflight.set(id, job);
  }
  const value = await job;
  if (opts.keep && !opts.keep(value)) {
    // A failed call shouldn't replace a good answer we already had, even an expired one.
    return old ? { value: old.value, hit: true, at: old.at } : { value, hit: false, at: Date.now() };
  }
  await put(ns, key, value, ttl);
  return { value, hit: false, at: Date.now() };
}

/** Hits and misses per API since the server started. */
export const cacheStats = () => ({ ...store.stats });
