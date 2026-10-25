import type { TripRequest } from "./schema";
import { addDays, calendarDates, daysBetween, fmt, parseISO, toISO } from "./dates";

export function buildPrompt(req: TripRequest, today = new Date()) {
  const n = daysBetween(req.start, req.end);
  const tripDates = Array.from({ length: n }, (_, i) => {
    const d = addDays(parseISO(req.start), i);
    return `${toISO(d)} (${fmt(d, { weekday: "short" })})`;
  });
  const cal = calendarDates(req.start, req.end);
  const stops = req.pace === "Relaxed" ? "3-4" : req.pace === "Packed" ? "5-6" : "4-5";

  return `You are an expert local travel planner. Today is ${toISO(today)}. Plan this trip.

<trip>
Destination: ${req.dest}
Dates: ${tripDates.join(", ")} (${n} days)
Travelers: ${req.travelers}
Total budget for the whole group: ${req.budget} ${req.currency}, covering stays, food, local transport and activities. Flights to and from the destination are excluded.
Pace: ${req.pace} (${stops} stops a day)
Interests: ${req.interests.length ? req.interests.join(", ") : "a good mix"}
</trip>

How to plan:
- Recommend only real, well-established places: named cafes, beaches, landmarks, viewpoints, markets, restaurants. If you are unsure a small business still operates, choose a better-known one instead. The traveler will look these up on a map.
- Group each day by area to keep travel short. Day 1 begins with arrival and check-in; the last day ends with departure.
- Respect weekly closures, market days, sunrise and sunset times, and the weather of the season on these dates.
- Costs are numbers in ${req.currency} for the whole group of ${req.travelers}; use 0 for free. Keep the plan within budget where realistic. If it can't fit, say so plainly in budget.note.
- Budget breakdown labels: Stays, Food & cafes, Transport, Activities, Buffer.
- Crowd levels use 1 quiet, 2 light, 3 moderate, 4 busy, 5 packed, based on tourist season, public and school holidays in the main visitor markets, festivals and events, and weekdays vs weekends.
- crowd.calendar has exactly ${cal.length} numbers, one per date from ${cal[0]} to ${cal[cal.length - 1]}, in order.
- crowd.alternative is a quieter date range of the same length within about six weeks of the trip, or null if these dates are already the quietest sensible choice.
- crowd.bestTime covers the most popular stop: levels has 15 numbers (0-100) for 6:00 through 20:00.
- days has exactly ${n} entries, in date order.
- gallery lists 8-12 of the most photogenic places from the plan, using names that would find a photo.
- Notes and tips are one short plain-text sentence each.`;
}
