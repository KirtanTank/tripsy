import { PRIORITY_LABELS, type TripRequest } from "./schema";
import { MODE_LABEL } from "./travel";
import { addDays, calendarDates, daysBetween, fmt, parseISO, toISO } from "./dates";
import { cacheKey } from "./cache";

export function buildPrompt(req: TripRequest, today = new Date()) {
  const n = daysBetween(req.start, req.end);
  const tripDates = Array.from({ length: n }, (_, i) => {
    const d = addDays(parseISO(req.start), i);
    return `${toISO(d)} (${fmt(d, { weekday: "short" })})`;
  });
  const cal = calendarDates(req.start, req.end);
  const stops = req.pace === "Relaxed" ? "3-4" : req.pace === "Packed" ? "5-6" : "4-5";
  const modes = req.modes.length ? req.modes.map((m) => MODE_LABEL[m]).join(", ") : "any (choose what fits best)";
  const priority = PRIORITY_LABELS[req.priority] ?? PRIORITY_LABELS[2];

  return `You are an expert local travel planner. Today is ${toISO(today)}. Plan this trip.

<trip>
Traveling from: ${req.from || "not given"}
Destination: ${req.dest}
Dates: ${tripDates.join(", ")} (${n} days)
Travelers: ${req.travelers}
Total budget for the whole group: ${req.budget} ${req.currency}. It covers everything: ${req.from ? "travel to and from the destination, " : ""}stays, food, local transport and activities.
Travel modes allowed: ${modes}
Time vs money: ${priority}
Pace: ${req.pace} (${stops} stops a day)
Interests: ${req.interests.length ? req.interests.join(", ") : "a good mix"}
</trip>

How to plan:
- Recommend only real, well-established places: named cafes, beaches, landmarks, viewpoints, markets, restaurants. If you are unsure a small business still operates, choose a better-known one instead. The traveler will look these up on a map.
- Group each day by area to keep travel short, and order each day's stops so the route doesn't double back. Day 1 begins with arrival and check-in; the last day ends with departure.
- ${req.from ? `travel.options lists 2-4 realistic ways to get from ${req.from} to ${req.dest} and back, at most one per mode${req.modes.length ? `, using only: ${modes}` : ""}. Skip modes that don't work for this route (for example driving across a sea). hours is one-way door to door; cost is round trip for the whole group. travel.chosen is the option that best fits "${priority}"; plan day 1's start and the last day's departure around it.` : "No home city was given, so travel is null."}
- Getting around at the destination should follow the same preferences: ${req.modes.includes("drive") ? "the travelers are happy to drive, so a rented car or scooter is fine" : "favour walking, public transport and the occasional taxi"}, and ${req.priority >= 3 ? "lean towards cheaper options like buses and shared rides" : req.priority <= 1 ? "lean towards taxis and fewer transfers to save time" : "balance cost and time"}.
- Give each stop's approximate lat and lng. They are used to measure distances between stops, so be as accurate as you can.
- Respect weekly closures, market days, sunrise and sunset times, and the weather of the season on these dates.
- Costs are numbers in ${req.currency} for the whole group of ${req.travelers}; use 0 for free. budget.breakdown covers spending at the destination only, never travel there and back. The breakdown plus the chosen travel option's cost should fit within the total budget where realistic. If it can't fit, say so plainly in budget.note.
- Budget breakdown labels: Stays, Food & cafes, Transport, Activities, Buffer.
- Crowd levels use 1 quiet, 2 light, 3 moderate, 4 busy, 5 packed, based on tourist season, public and school holidays in the main visitor markets, festivals and events, and weekdays vs weekends.
- crowd.calendar has exactly ${cal.length} numbers, one per date from ${cal[0]} to ${cal[cal.length - 1]}, in order.
- crowd.alternative is a quieter date range of the same length within about six weeks of the trip, or null if these dates are already the quietest sensible choice.
- crowd.bestTime covers the most popular stop: levels has 15 numbers (0-100) for 6:00 through 20:00.
- days has exactly ${n} entries, in date order.
- gallery lists 8-12 of the most photogenic places from the plan, using names that would find a photo.
- Notes and tips are one short plain-text sentence each.`;
}

/**
 * The cache key for a plan: the model plus the exact prompt Claude would get, built from the request
 * with capitals, extra spaces and the order of interests and modes evened out.
 * Map coordinates aren't part of the prompt, so they don't split the cache. Neither does "Today is…":
 * the date is pinned here, and plans expire after PLAN_TTL anyway.
 */
export function planCacheKey(model: string, req: TripRequest) {
  const tidy = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
  const norm = { ...req, from: tidy(req.from), dest: tidy(req.dest), interests: [...req.interests].map(tidy).sort(), modes: [...req.modes].sort() };
  return cacheKey([model, buildPrompt(norm, new Date(0))]);
}
