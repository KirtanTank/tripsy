import { deleteTrip, getTrip } from "@/lib/db";
import { ownerId } from "@/lib/owner";

export const runtime = "nodejs";

const ID = /^[\w-]{6,32}$/;

/** Anyone with the link can open a trip; `mine` says whether it's the visitor's own. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID.test(id)) return Response.json({ error: "Trip not found" }, { status: 404 });
  try {
    const trip = await getTrip(id, await ownerId({ create: false }));
    return trip ? Response.json(trip) : Response.json({ error: "Trip not found" }, { status: 404 });
  } catch (e) {
    console.error("getTrip", e);
    return Response.json({ error: "Couldn't load the trip" }, { status: 503 });
  }
}

/** Only the visitor who saved a trip can delete it. */
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await ownerId({ create: false });
  if (!owner || !ID.test(id)) return Response.json({ error: "Trip not found" }, { status: 404 });
  try {
    return (await deleteTrip(id, owner)) ? new Response(null, { status: 204 }) : Response.json({ error: "Trip not found" }, { status: 404 });
  } catch (e) {
    console.error("deleteTrip", e);
    return Response.json({ error: "Couldn't delete the trip" }, { status: 503 });
  }
}
