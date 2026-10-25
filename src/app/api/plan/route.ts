import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { MAX_DAYS, TripRequestSchema, TripSchema, type PlanEvent } from "@/lib/schema";
import { daysBetween } from "@/lib/dates";
import { buildPrompt } from "@/lib/prompt";

export const runtime = "nodejs";
export const maxDuration = 300;

const MODEL = "claude-opus-5-5";

export async function POST(request: Request) {
  const parsed = TripRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Some trip details are missing or invalid." }, { status: 400 });
  const req = parsed.data;
  const n = daysBetween(req.start, req.end);
  if (n < 1 || n > MAX_DAYS) return Response.json({ error: `Trips must be between 1 and ${MAX_DAYS} days.` }, { status: 400 });

  let client: Anthropic;
  try {
    client = new Anthropic();
  } catch {
    return Response.json({ error: "The planner isn't set up yet: add ANTHROPIC_API_KEY to .env.local and restart the server." }, { status: 503 });
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
          else send({ type: "done", trip: { ...trip.data, days: trip.data.days.slice(0, n) } });
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
          send({ type: "error", message: "The planner isn't set up yet: add ANTHROPIC_API_KEY to .env.local and restart the server." });
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
