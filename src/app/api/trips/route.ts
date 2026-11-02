import { z } from "zod";
import { TripRequestSchema, type Trip } from "@/lib/schema";
import { listTrips, saveTrip } from "@/lib/db";
import { ownerId } from "@/lib/owner";

export const runtime = "nodejs";

const MAX_BYTES = 256 * 1024;

// The trip came from our own planner, so it's only checked for shape here; the UI already copes with odd values.
const Body = z.object({ request: TripRequestSchema, trip: z.looseObject({ days: z.array(z.unknown()).min(1) }) });

/** The visitor's saved trips, newest first. */
export async function GET() {
  const owner = await ownerId({ create: false });
  if (!owner) return Response.json({ trips: [] });
  try {
    return Response.json({ trips: await listTrips(owner) });
  } catch (e) {
    console.error("listTrips", e);
    return Response.json({ error: "Couldn't load your trips" }, { status: 503 });
  }
}

/** Saves a planned trip and returns its share id. */
export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > MAX_BYTES) return Response.json({ error: "Trip too large" }, { status: 413 });
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* falls through to the shape check */
  }
  const body = Body.safeParse(json);
  if (!body.success) return Response.json({ error: "Invalid trip" }, { status: 400 });
  const owner = (await ownerId({ create: true }))!;
  try {
    const id = await saveTrip(owner, body.data.request, body.data.trip as unknown as Trip);
    return Response.json({ id });
  } catch (e) {
    console.error("saveTrip", e);
    return Response.json({ error: "Couldn't save the trip" }, { status: 503 });
  }
}
