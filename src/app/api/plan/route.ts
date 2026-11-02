import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { MAX_DAYS, TripRequestSchema, TripSchema, type Day, type PlanEvent, type Trip, type TripRequest } from "@/lib/schema";
import { daysBetween } from "@/lib/dates";
import { buildPrompt, planCacheKey } from "@/lib/prompt";
import { distanceKm, hasCoords } from "@/lib/geo";
import { locate, locateStop, mapLimit } from "@/lib/photon";
import { peek, put } from "@/lib/cache";

export const runtime = "nodejs";
export const maxDuration = 300;

// Visitors to the live site shouldn't see setup instructions meant for whoever runs it.
const NO_KEY =
  process.env.NODE_ENV === "production"
    ? "Planning new trips isn't switched on for this site yet. Open the example trip to see how it works."
    : "The planner isn't set up yet: add ANTHROPIC_API_KEY to .env.local and restart the server.";

const MODEL = "claude-opus-5-5";
/** How long a finished plan is reused for an identical request. Crowd and price estimates hold up for about a week. */
const PLAN_TTL = 60 * 60 * 24 * 7;


/**
 * Replaces Claude's approximate stop coordinates with real map positions where the geocoder
 * finds the place near the destination. Stops it can't place keep Claude's estimate if that is
 * plausibly near the destination, otherwise lose their coordinates (the UI then skips the distance).
 */
async function pinStops(days: Day[], req: TripRequest): Promise<Day[]> {
  try {
    const center = hasCoords(req.destCoords) ? req.destCoords : await locate(req.dest);
    if (!center) return days;
    const stops = days.flatMap((d) => d.stops);
    const found = await mapLimit(stops, 5, (s) => (s.type === "move" ? Promise.resolve(null) : locateStop(s.name, center).catch(() => null)));
    let i = 0;
    return days.map((d) => ({
      ...d,
      stops: d.stops.map((s) => {
        const hit = found[i++];
        if (hit) return { ...s, lat: hit.lat, lng: hit.lon };
        const guess = { lat: s.lat, lon: s.lng };
        return hasCoords(guess) && distanceKm(guess, center) < 150 ? s : { ...s, lat: NaN, lng: NaN };
      }),
    }));
  } catch {
    return days;
  }
}

export async function POST(request: Request) {
  const parsed = TripRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Some trip details are missing or invalid." }, { status: 400 });
  const req = parsed.data;
  const n = daysBetween(req.start, req.end);
  if (n < 1 || n > MAX_DAYS) return Response.json({ error: `Trips must be between 1 and ${MAX_DAYS} days.` }, { status: 400 });

  // Same trip asked recently: answer from the cache. This works even without an API key.
  const key = planCacheKey(MODEL, req);
  const fresh = new URL(request.url).searchParams.get("fresh") === "1";
  const hit = fresh ? null : await peek<Trip>("plan", key);
  if (hit) {
    const done: PlanEvent = { type: "done", trip: hit.value, cachedAt: new Date(hit.at).toISOString() };
    return new Response(JSON.stringify(done) + "\n", { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
  }

  let client: Anthropic;
  try {
    client = new Anthropic();
  } catch {
    return Response.json({ error: NO_KEY }, { status: 503 });
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (ev: PlanEvent) => controller.enqueue(encoder.encode(JSON.stringify(ev) + "\n"));
      const stream = client.beta.messages.stream({
        model: MODEL,
        max_tokens: 32000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium", format: betaZodOutputFormat(TripSchema) },
        messages: [{ role: "user", content: buildPrompt(req) }],
      });
      request.signal.addEventListener("abort", () => stream.abort());

      // Report progress from the streamed JSON: which section is being written and how many days are done.
      let last = "";
      stream.on("text", (_delta, snapshot) => {
        const days = (snapshot.match(/"stops"\s*:/g) || []).length;
        const stage = /"gallery"\s*:/.test(snapshot) ? "gallery" : days ? "days" : "crowds";
        const key = `${stage}:${days}`;
        if (key !== last) {
          last = key;
          send({ type: "progress", stage, days });
        }
      });

      try {
        const message = await stream.finalMessage();
        if (message.stop_reason === "refusal") {
          send({ type: "error", message: "Claude couldn't plan that request. Try a different destination or wording." });
        } else if (message.stop_reason === "max_tokens") {
          send({ type: "error", message: "The plan ran too long. Try fewer days or a slower pace." });
        } else {
          const text = message.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
          const trip = TripSchema.safeParse(JSON.parse(text));
          if (!trip.success || trip.data.days.length === 0) send({ type: "error", message: "The plan came back incomplete. Try again." });
          else {
            send({ type: "progress", stage: "places", days: n });
            const days = await pinStops(trip.data.days.slice(0, n), req);
            const result = { ...trip.data, days };
            await put("plan", key, result, PLAN_TTL);
            send({ type: "done", trip: result });
          }
        }
      } catch (err) {
        if (request.signal.aborted) {
          /* the visitor pressed Stop */
        } else if (err instanceof Anthropic.AuthenticationError) {
          send({ type: "error", message: "The server's Claude API key is missing or invalid. Check ANTHROPIC_API_KEY in .env.local." });
        } else if (err instanceof Anthropic.RateLimitError) {
          send({ type: "error", message: "The planner is busy right now. Wait a minute and try again." });
        } else if (err instanceof Anthropic.APIError) {
          console.error("Claude API error", err.status, err.message);
          send({ type: "error", message: "Claude is having trouble right now. Try again in a moment." });
        } else if (err instanceof SyntaxError) {
          send({ type: "error", message: "The plan came back incomplete. Try again." });
        } else if (/api key|authentication/i.test((err as Error)?.message ?? "")) {
          send({ type: "error", message: NO_KEY });
        } else {
          console.error(err);
          send({ type: "error", message: "Something went wrong while planning. Try again." });
        }
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed by an abort */
        }
      }
    },
  });

  return new Response(body, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
