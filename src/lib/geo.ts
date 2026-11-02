export type Coords = { lat: number; lon: number };

/** A search suggestion from /api/places. */
export type Place = Coords & {
  label: string; // "Panaji, Goa, India" — what goes in the input
  name: string; // "Panaji"
  detail: string; // "Goa, India"
  kind: "city" | "region" | "country" | "airport" | "place";
};

export const hasCoords = (c: Partial<Coords> | null | undefined): c is Coords =>
  !!c && Number.isFinite(c.lat) && Number.isFinite(c.lon) && Math.abs(c.lat!) <= 90 && Math.abs(c.lon!) <= 180;

/** Great-circle distance in km. */
export function distanceKm(a: Coords, b: Coords) {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const formatKm = (km: number) => (km < 1 ? `${Math.round(km * 1000 / 50) * 50} m` : km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km).toLocaleString("en")} km`);

const duration = (hours: number) => {
  const mins = Math.max(5, Math.round((hours * 60) / 5) * 5);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
};

/**
 * Rough travel time between two stops of a day, from straight-line distance.
 * Roads are ~1.3× longer than a straight line; local traffic averages ~28 km/h, highways ~55 km/h.
 */
export function hopHint(km: number) {
  const road = km * 1.3;
  if (road <= 1.2) return { mode: "walk" as const, text: `${duration(road / 4.5)} walk` };
  return { mode: "drive" as const, text: `${duration(road / (road < 40 ? 28 : 55))} drive` };
}

/** Rough way to get from the home city to the destination. */
export function journeyHint(km: number) {
  if (km < 30) return "A short local ride away";
  if (km < 350) return `About ${duration((km * 1.3) / 55)} by road`;
  if (km < 700) return `About ${duration((km * 1.3) / 60)} by road or train, or a short flight`;
  return `About ${duration(km / 700 + 0.75)} flying time`;
}
