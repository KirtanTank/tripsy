import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Trips belong to an anonymous id in a cookie, so each visitor sees their own without signing up.
 * Clearing cookies loses the list, though share links keep working.
 */
const COOKIE = "tripsy_owner";
const YEAR = 60 * 60 * 24 * 365;

export async function ownerId({ create }: { create: boolean }) {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (id && /^[0-9a-f-]{36}$/.test(id)) return id;
  if (!create) return null;
  const fresh = randomUUID();
  jar.set(COOKIE, fresh, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: YEAR, path: "/" });
  return fresh;
}
