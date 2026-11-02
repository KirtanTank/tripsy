import { randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { Trip, TripRequest } from "./schema";
import { planCacheKey } from "./prompt";

/**
 * Saved trips, in Postgres.
 * - With DATABASE_URL (Neon, Supabase, any Postgres), it connects there.
 * - Without it, an embedded Postgres (PGlite) keeps the data in .data/db, so local dev needs no setup.
 * Both run the same SQL, so moving to a hosted database is just setting the variable.
 */
type Query = <T>(text: string, params?: unknown[]) => Promise<T[]>;

const SCHEMA = `
  create table if not exists trips (
    id text primary key,
    owner text not null,
    req_key text not null,
    request jsonb not null,
    trip jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (owner, req_key)
  );
  create index if not exists trips_owner_updated on trips (owner, updated_at desc);
`;

async function connect(): Promise<Query> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    // Serverless hosts open many short connections, so keep the pool small. Hosted Postgres wants TLS; a local one doesn't.
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    // prepare: false because pooled connection strings (Supabase on port 6543, Neon's -pooler hosts) can't keep prepared statements.
    const sql = postgres(url, { max: 5, idle_timeout: 20, ssl: local ? false : "require", prepare: false, onnotice: () => {} });
    await sql.unsafe(SCHEMA);
    return async <T>(text: string, params: unknown[] = []) => (await sql.unsafe(text, params as never[])) as unknown as T[];
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = process.env.PGLITE_DIR || path.join(process.cwd(), ".data", "db");
  // PGlite creates the database folder but not its parents.
  await mkdir(path.dirname(dir), { recursive: true });
  const db = await PGlite.create(dir);
  await db.exec(SCHEMA);
  return async <T>(text: string, params: unknown[] = []) => (await db.query<T>(text, params)).rows;
}

// One connection per server process, kept across dev hot reloads.
const g = globalThis as typeof globalThis & { __tripsyDb?: Promise<Query> };
function db() {
  g.__tripsyDb ??= connect().catch((e) => {
    g.__tripsyDb = undefined;
    throw e;
  });
  return g.__tripsyDb;
}

/** Short, unguessable id used in share links. */
const newId = () => randomBytes(8).toString("base64url");

/** The same trip planned twice by the same visitor updates one row instead of piling up copies. */
const reqKey = (r: TripRequest) => planCacheKey("trip", r);

export type TripSummary = { id: string; dest: string; start: string; end: string; headline: string; updatedAt: string };
export type SavedTrip = { id: string; request: TripRequest; trip: Trip; updatedAt: string; mine: boolean };

export async function saveTrip(owner: string, request: TripRequest, trip: Trip) {
  const q = await db();
  const [row] = await q<{ id: string }>(
    `insert into trips (id, owner, req_key, request, trip) values ($1, $2, $3, $4::jsonb, $5::jsonb)
     on conflict (owner, req_key) do update set request = excluded.request, trip = excluded.trip, updated_at = now()
     returning id`,
    // Objects, not JSON strings: both drivers encode them as jsonb, while a string would be stored as a quoted JSON string.
    [newId(), owner, reqKey(request), request, trip]
  );
  return row.id;
}

export async function getTrip(id: string, owner: string | null): Promise<SavedTrip | null> {
  const q = await db();
  const [row] = await q<{ id: string; owner: string; request: TripRequest; trip: Trip; updated_at: Date }>(
    `select id, owner, request, trip, updated_at from trips where id = $1`,
    [id]
  );
  if (!row) return null;
  return { id: row.id, request: row.request, trip: row.trip, updatedAt: new Date(row.updated_at).toISOString(), mine: row.owner === owner };
}

export async function listTrips(owner: string, limit = 20): Promise<TripSummary[]> {
  const q = await db();
  const rows = await q<{ id: string; dest: string; start: string; end: string; headline: string; updated_at: Date }>(
    `select id, request->>'dest' as dest, request->>'start' as start, request->>'end' as "end", trip->>'headline' as headline, updated_at
     from trips where owner = $1 order by updated_at desc limit $2`,
    [owner, limit]
  );
  return rows.map((r) => ({ id: r.id, dest: r.dest, start: r.start, end: r.end, headline: r.headline, updatedAt: new Date(r.updated_at).toISOString() }));
}

export async function deleteTrip(id: string, owner: string) {
  const q = await db();
  const rows = await q<{ id: string }>(`delete from trips where id = $1 and owner = $2 returning id`, [id, owner]);
  return rows.length > 0;
}
