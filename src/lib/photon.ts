import { distanceKm, hasCoords, type Coords, type Place } from "./geo";
import { cached } from "./cache";

/**
 * Place search via Photon (https://photon.komoot.io), a free geocoder built on OpenStreetMap.
 * No key needed; keep request volume modest. Places don't move, so answers are cached for 30 days.
 */
const BASE = "https://photon.komoot.io/api/";
const UA = "Tripsy/0.1 (travel itinerary demo)";

type Feature = {
  geometry: { coordinates: [number, number] };
  properties: { name?: string; city?: string; county?: string; state?: string; country?: string; osm_key?: string; osm_value?: string; type?: string };
};

const TTL = 60 * 60 * 24 * 30;

async function photon(params: Record<string, string>, timeoutMs = 5000): Promise<Feature[]> {
  const query = { lang: "en", ...params, q: params.q.trim().replace(/\s+/g, " ").toLowerCase() };
  const { value } = await cached(
    "places",
    query,
    TTL,
    async () => {
      const res = await fetch(BASE + "?" + new URLSearchParams(query), { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
      if (!res.ok) return [];
      const j = await res.json();
      return (Array.isArray(j?.features) ? j.features : []) as Feature[];
    },
    // An empty answer may be a hiccup, so it's asked again next time.
    { keep: (f) => f.length > 0 }
  );
  return value;
}

const kindOf = (p: Feature["properties"]): Place["kind"] => {
  if (p.osm_value === "aerodrome") return "airport";
  if (p.type === "country") return "country";
  if (p.type === "state" || p.osm_value === "state" || p.osm_value === "region" || p.osm_value === "island" || p.osm_value === "archipelago") return "region";
  if (p.type === "city" || p.type === "district" || ["city", "town", "village", "suburb", "hamlet"].includes(p.osm_value ?? "")) return "city";
  return "place";
};

/** Destination / home-city suggestions for the planner's search boxes. */
export async function searchPlaces(q: string): Promise<Place[]> {
  const features = await photon({ q, limit: "10" });
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const f of features) {
    const p = f.properties;
    if (!p.name) continue;
    // Skip admin names that only exist in a non-Latin script; the English country name still identifies the place.
    const latin = (x?: string) => !!x && /^[\p{Script=Latin}\p{N}\s.,'’()-]+$/u.test(x);
    const detail = [p.name !== p.city ? p.city : null, p.name !== p.state ? p.state : null, p.country !== p.name ? p.country : null]
      .filter((x): x is string => latin(x ?? undefined))
      .join(", ");
    const label = detail ? `${p.name}, ${detail}` : p.name;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const [lon, lat] = f.geometry.coordinates;
    out.push({ label, name: p.name, detail, lat, lon, kind: kindOf(p) });
    if (out.length === 7) break;
  }
  // Places people travel to (cities, regions, countries) first; streets and shops last.
  const rank: Record<Place["kind"], number> = { region: 0, city: 0, country: 1, airport: 2, place: 3 };
  return out.sort((a, b) => rank[a.kind] - rank[b.kind]);
}

/** Best guess at where a named stop is, biased towards the destination and rejected if it lands far away. */
export async function locateStop(name: string, near: Coords, maxKm = 120): Promise<Coords | null> {
  const features = await photon({ q: name, limit: "3", lat: String(near.lat), lon: String(near.lon), location_bias_scale: "0.5" }, 4000);
  for (const f of features) {
    const c = { lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] };
    if (hasCoords(c) && distanceKm(c, near) <= maxKm) return c;
  }
  return null;
}

export async function locate(q: string): Promise<Coords | null> {
  const [f] = await photon({ q, limit: "1" }, 4000);
  return f ? { lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] } : null;
}

/** Runs `fn` over items with at most `limit` in flight, so a 40-stop trip doesn't hammer the geocoder. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    })
  );
  return out;
}
