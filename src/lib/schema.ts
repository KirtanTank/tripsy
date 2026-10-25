import { z } from "zod";

export const STOP_TYPES = ["cafe", "beach", "sight", "food", "nature", "night", "move", "stay"] as const;
export type StopType = (typeof STOP_TYPES)[number];

export const PACES = ["Relaxed", "Balanced", "Packed"] as const;
export const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "THB", "JPY", "AUD", "SGD"] as const;
export const INTERESTS = ["Beaches", "Cafes", "Culture & history", "Food", "Nature", "Nightlife", "Shopping", "Adventure"] as const;
export const MAX_DAYS = 14;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** What the planner sends to /api/plan. */
export const TripRequestSchema = z.object({
  dest: z.string().trim().min(1).max(120),
  start: isoDate,
  end: isoDate,
  budget: z.number().positive().max(1e9),
  currency: z.enum(CURRENCIES),
  travelers: z.number().int().min(1).max(20),
  pace: z.enum(PACES),
  interests: z.array(z.string().max(40)).max(INTERESTS.length),
});
export type TripRequest = z.infer<typeof TripRequestSchema>;

/** What Claude returns. Kept free of numeric bounds so it maps cleanly to structured outputs; the UI clamps. */
export const StopSchema = z.object({
  time: z.string().describe("24h local time, e.g. 09:30"),
  name: z.string().describe("Real, established place name"),
  type: z.enum(STOP_TYPES),
  note: z.string().describe("One short sentence: why go, what to order or see"),
  cost: z.number().describe("Cost for the whole group in the trip currency; 0 if free"),
});

export const DaySchema = z.object({
  title: z.string().describe("Max 6 words"),
  area: z.string().describe("Neighbourhood or region"),
  crowd: z.number().describe("1 quiet, 2 light, 3 moderate, 4 busy, 5 packed"),
  cost: z.number().describe("Total cost of the day for the group"),
  tip: z.string().describe("One practical tip"),
  stops: z.array(StopSchema),
});

export const TripSchema = z.object({
  headline: z.string().describe("Punchy line, max 8 words"),
  summary: z.string().describe("One sentence"),
  budget: z.object({
    breakdown: z.array(z.object({ label: z.string(), amount: z.number() })),
    note: z.string(),
  }),
  crowd: z.object({
    headline: z.string().describe("Max 7 words"),
    summary: z.string(),
    calendar: z.array(z.number()).describe("One crowd level (1-5) per requested calendar date, in order"),
    reasons: z.array(z.string()),
    alternative: z
      .object({ start: z.string(), end: z.string(), why: z.string() })
      .nullable()
      .describe("A quieter date range of the same length, or null"),
    bestTime: z.object({
      place: z.string(),
      window: z.string().describe("e.g. 6 – 8 am"),
      levels: z.array(z.number()).describe("15 values 0-100, one per hour from 6:00 to 20:00"),
    }),
  }),
  days: z.array(DaySchema),
  gallery: z.array(z.object({ place: z.string(), type: z.enum(STOP_TYPES) })),
});

export type Trip = z.infer<typeof TripSchema>;
export type Day = z.infer<typeof DaySchema>;
export type Stop = z.infer<typeof StopSchema>;

/** Wire format of the /api/plan NDJSON stream. */
export type PlanEvent =
  | { type: "progress"; days: number; stage: "thinking" | "crowds" | "days" | "gallery" }
  | { type: "done"; trip: Trip }
  | { type: "error"; message: string };
