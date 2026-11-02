import { searchPlaces } from "@/lib/photon";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) ?? "";
  if (q.length < 2) return Response.json({ places: [] });
  try {
    const places = await searchPlaces(q);
    return Response.json({ places }, { headers: { "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
  } catch {
    return Response.json({ places: [] });
  }
}
