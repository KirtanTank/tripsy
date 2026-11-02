// Rush meter signals. Each source can fail on its own and every one goes through lib/cache.
// Road: Mapbox (MAPBOX_TOKEN) or TomTom (TOMTOM_API_KEY). Air: OpenSky. Interest: Wikipedia pageviews.
import { addDays, parseISO, toISO } from "@/lib/dates";
import { hasCoords, type Coords } from "@/lib/geo";
import { cached } from "@/lib/cache";
import { RUSH_REFRESH_MIN, rushPhase, rushWindow, type AirSignal, type InterestSignal, type RoadSignal, type RushData } from "@/lib/rush";

export const runtime = "nodejs";

const UA = "Tripsy/0.1 (travel itinerary demo)";
const TIMEOUT = 8000;

/** How long each answer is reused, in seconds. A manual refresh can skip the road cache once it's a minute old. */
const TTL = { road: RUSH_REFRESH_MIN * 60, air: 60, interest: 60 * 60 };
const REFRESH_MIN_AGE = 60;

const get = (url: string) => fetch(url, { headers: { "User-Agent": UA }, cache: "no-store", signal: AbortSignal.timeout(TIMEOUT) });

const coords = (lat: string | null, lon: string | null) => {
  const c = { lat: Number(lat), lon: Number(lon) };
  return lat && lon && hasCoords(c) ? c : null;
};

function routePoints(from: Coords | null, to: Coords) {
  if (!from) return [to];
  return [0.15, 0.35, 0.55, 0.75, 0.92, 1].map((t) => ({ lat: from.lat + (to.lat - from.lat) * t, lon: from.lon + (to.lon - from.lon) * t }));
}

const NO_ROAD = { delay: 0, flow: 1, points: 0 };

// Mapbox bills per request past the free tier, so on top of the cache there's a monthly cap.
// The count lives in server memory, so a restart clears it; the cap errs on the side of counting.
const g = globalThis as typeof globalThis & { __mapboxUse?: { month: string; count: number } };
const mapboxUse = (g.__mapboxUse ??= { month: "", count: 0 });
const MAPBOX_CAP = Number(process.env.MAPBOX_MONTHLY_CAP) || 50000;

async function mapboxRoute(from: Coords, to: Coords, token: string, profile: "driving-traffic" | "driving") {
  const res = await get(
    `https://api.mapbox.com/directions/v5/mapbox/${profile}/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false&alternatives=false&access_token=${token}`
  );
  if (res.status === 401 || res.status === 403) throw new Error("token");
  if (!res.ok) return null;
  const r = (await res.json())?.routes?.[0];
  return r?.duration > 0 ? (r as { duration: number; duration_typical?: number; distance: number }) : null;
}

async function mapbox(from: Coords, to: Coords, token: string): Promise<RoadSignal> {
  const month = new Date().toISOString().slice(0, 7);
  if (mapboxUse.month !== month) Object.assign(mapboxUse, { month, count: 0 });
  if (mapboxUse.count + 2 > MAPBOX_CAP) return { status: "unavailable", provider: "mapbox", ...NO_ROAD, reason: "Monthly Mapbox cap reached" };

  try {
    mapboxUse.count++;
    const now = await mapboxRoute(from, to, token, "driving-traffic");
    if (!now) return { status: "unavailable", provider: "mapbox", ...NO_ROAD, reason: "Mapbox found no road route" };
    // driving-traffic usually includes a typical-day duration; if not, ask for the no-traffic time instead.
    let typical = now.duration_typical;
    if (!(typical! > 0)) {
      mapboxUse.count++;
      typical = (await mapboxRoute(from, to, token, "driving"))?.duration;
    }
    if (!(typical! > 0)) return { status: "unavailable", provider: "mapbox", ...NO_ROAD, reason: "Mapbox gave no typical time" };
    const data: RoadSignal = {
      status: "live",
      provider: "mapbox",
      minutes: now.duration / 60,
      typicalMinutes: typical! / 60,
      km: now.distance / 1000,
      // Negative when traffic is lighter than a typical day.
      delay: now.duration / typical! - 1,
      flow: Math.min(1, typical! / now.duration),
      points: 0,
    };
    return data;
  } catch (e) {
    const reason = (e as Error).message === "token" ? "Mapbox rejected the token in MAPBOX_TOKEN" : "Mapbox didn't answer";
    return { status: "unavailable", provider: "mapbox", ...NO_ROAD, reason };
  }
}

async function tomtom(from: Coords | null, to: Coords, key: string): Promise<RoadSignal> {
  // flowSegmentData snaps each point to the nearest road; points with no road nearby just fail.
  const segs = await Promise.all(
    routePoints(from, to).map(async (p) => {
      try {
        const res = await get(`https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?unit=KMPH&point=${p.lat},${p.lon}&key=${key}`);
        if (!res.ok) return null;
        const s = (await res.json())?.flowSegmentData;
        return s?.freeFlowTravelTime > 0 && s?.freeFlowSpeed > 0 ? s : null;
      } catch {
        return null;
      }
    })
  );
  const ok = segs.filter(Boolean) as { currentSpeed: number; freeFlowSpeed: number; currentTravelTime: number; freeFlowTravelTime: number }[];
  if (!ok.length) return { status: "unavailable", provider: "tomtom", ...NO_ROAD, reason: "TomTom didn't answer" };
  const cur = ok.reduce((a, s) => a + s.currentTravelTime, 0);
  const free = ok.reduce((a, s) => a + s.freeFlowTravelTime, 0);
  const flow = ok.reduce((a, s) => a + Math.min(1, s.currentSpeed / s.freeFlowSpeed), 0) / ok.length;
  return { status: "live", provider: "tomtom", delay: Math.max(0, cur / free - 1), flow, points: ok.length };
}

/** Roughly 100 m precision, so the same trip from slightly different map pins shares one cache entry. */
const spot = (c: Coords | null) => (c ? [+c.lat.toFixed(3), +c.lon.toFixed(3)] : null);
const live = (x: { status: string }) => x.status === "live";

async function road(from: Coords | null, to: Coords, fresh: boolean) {
  const mb = process.env.MAPBOX_TOKEN;
  const tt = process.env.TOMTOM_API_KEY;
  const opts = { fresh, minAge: REFRESH_MIN_AGE, keep: live };
  if (mb && from) return cached("mapbox", [spot(from), spot(to)], TTL.road, () => mapbox(from, to, mb), opts);
  if (tt) return cached("tomtom", [spot(from), spot(to)], TTL.road, () => tomtom(from, to, tt), opts);
  return { value: roadWithoutKey(mb), hit: false, at: Date.now() };
}

function roadWithoutKey(mb: string | undefined): RoadSignal {
  if (mb) return { status: "unavailable", provider: "mapbox", ...NO_ROAD, reason: "Add a From city to measure the drive" };
  return { status: "no-key", provider: null, ...NO_ROAD };
}

async function air(to: Coords): Promise<AirSignal> {
  // About 150 km around the destination. Anonymous OpenSky access allows ~400 small queries a day.
  const dLat = 1.35;
  const dLon = 1.35 / Math.max(0.2, Math.cos((to.lat * Math.PI) / 180));
  try {
    const res = await get(`https://opensky-network.org/api/states/all?lamin=${to.lat - dLat}&lomin=${to.lon - dLon}&lamax=${to.lat + dLat}&lomax=${to.lon + dLon}`);
    if (!res.ok) return { status: "unavailable", overhead: 0, low: 0 };
    const states: unknown[][] = (await res.json())?.states ?? [];
    // State vector fields: 7 = barometric altitude (m), 8 = on ground, 13 = geometric altitude (m).
    const flying = states.filter((s) => s[8] === false);
    const low = flying.filter((s) => {
      const alt = Number(s[13] ?? s[7]);
      return Number.isFinite(alt) && alt < 3500;
    });
    return { status: "live", overhead: flying.length, low: low.length };
  } catch {
    return { status: "unavailable", overhead: 0, low: 0 };
  }
}

const compact = (iso: string) => iso.replaceAll("-", "");

async function interest(dest: string, start: string): Promise<InterestSignal> {
  const fail: InterestSignal = { status: "unavailable", article: "", days: [], baseline: 0, ratio: 1, latest: false };
  try {
    // "Pushkar, Rajasthan, India" → the best-matching English Wikipedia article.
    const q = dest.split(",").slice(0, 2).join(" ");
    const sr = await get(`https://en.wikipedia.org/w/api.php?action=query&list=search&srlimit=1&format=json&formatversion=2&srsearch=${encodeURIComponent(q)}`);
    const article: string | undefined = (await sr.json())?.query?.search?.[0]?.title;
    if (!article) return fail;

    // Pageviews lag about a day, so yesterday is the newest day we can have.
    const yesterday = toISO(addDays(new Date(), -1));
    const win = rushWindow(start);
    const latest = win.start > yesterday;
    const showEnd = latest ? yesterday : win.end < yesterday ? win.end : yesterday;
    const showStart = latest ? toISO(addDays(parseISO(yesterday), -4)) : win.start;
    const from = toISO(addDays(parseISO(showStart), -60));

    const pv = await get(
      `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/${encodeURIComponent(article.replaceAll(" ", "_"))}/daily/${compact(from)}/${compact(showEnd)}`
    );
    if (!pv.ok) return { ...fail, article };
    const items: { timestamp: string; views: number }[] = (await pv.json())?.items ?? [];
    const all = items.map((i) => ({ date: `${i.timestamp.slice(0, 4)}-${i.timestamp.slice(4, 6)}-${i.timestamp.slice(6, 8)}`, views: i.views }));
    const days = all.filter((d) => d.date >= showStart);
    const before = all.filter((d) => d.date < showStart).map((d) => d.views).sort((a, b) => a - b);
    if (!days.length) return { ...fail, article };
    const baseline = before.length ? before[Math.floor(before.length / 2)] : 0;
    return { status: "live", article, days, baseline, ratio: baseline ? days[days.length - 1].views / baseline : 1, latest };
  } catch {
    return fail;
  }
}

export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const to = coords(p.get("lat"), p.get("lon"));
  const from = coords(p.get("fromLat"), p.get("fromLon"));
  const dest = p.get("dest")?.trim().slice(0, 160) ?? "";
  const start = p.get("start") ?? "";
  const end = p.get("end") ?? start;
  const fresh = p.get("fresh") === "1";
  if (!to || !dest || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return Response.json({ error: "Missing destination, coordinates or dates" }, { status: 400 });
  }

  const today = toISO(new Date());
  const [r, a, i] = await Promise.all([
    road(from, to, fresh),
    cached("opensky", spot(to), TTL.air, () => air(to), { keep: live }),
    // The interest window depends on today's date, so a new day means a new entry.
    cached("wikipedia", [dest.toLowerCase(), start, today], TTL.interest, () => interest(dest, start), { keep: live }),
  ]);
  const data: RushData = {
    // When the oldest reading shown was taken, so "Updated X min ago" stays honest when answers come from the cache.
    updatedAt: new Date(Math.min(r.at, a.at, i.at)).toISOString(),
    window: rushWindow(start),
    phase: rushPhase(start, end),
    road: r.value,
    air: a.value,
    interest: i.value,
    fromCache: [r.hit && "road", a.hit && "air", i.hit && "interest"].filter((x): x is string => !!x),
  };
  return Response.json(data, { headers: { "cache-control": "no-store" } });
}
