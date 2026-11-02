import { z } from "zod";

export const STOP_TYPES = ["cafe", "beach", "sight", "food", "nature", "night", "move", "stay"] as const;
export type StopType = (typeof STOP_TYPES)[number];

export const PACES = ["Relaxed", "Balanced", "Packed"] as const;
export const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "THB", "JPY", "AUD", "SGD"] as const;
export const INTERESTS = ["Beaches", "Cafes", "Culture & history", "Food", "Nature", "Nightlife", "Shopping", "Adventure"] as const;
export const MAX_DAYS = 14;
export const TRAVEL_MODES = ["flight", "train", "bus", "drive"] as const;
export type TravelMode = (typeof TRAVEL_MODES)[number];
/** 0 = time matters most … 4 = money matters most. */
export const PRIORITY_LABELS = ["Time matters most", "Mostly time", "Both equally", "Mostly money", "Money matters most"] as const;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const CoordsSchema = z.object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) });

/** What the planner sends to /api/plan. Coordinates are present when the place was picked from the suggestions. */
export const TripRequestSchema = z.object({
  from: z.string().trim().max(120).default(""),
  fromCoords: CoordsSchema.nullish(),
  dest: z.string().trim().min(1).max(120),
  destCoords: CoordsSchema.nullish(),
  start: isoDate,
  end: isoDate,
  budget: z.number().positive().max(1e9),
  currency: z.enum(CURRENCIES),
  travelers: z.number().int().min(1).max(20),
  pace: z.enum(PACES),
  interests: z.array(z.string().max(40)).max(INTERESTS.length),
  /** Empty = "Best option": Claude may use any mode. */
  modes: z.array(z.enum(TRAVEL_MODES)).max(TRAVEL_MODES.length).default([]),
  priority: z.number().int().min(0).max(4).default(2),
});
export type TripRequest = z.infer<typeof TripRequestSchema>;

/** What Claude returns. Kept free of numeric bounds so it maps cleanly to structured outputs; the UI clamps. */
export const StopSchema = z.object({
  time: z.string().describe("24h local time, e.g. 09:30"),
  name: z.string().describe("Real, established place name"),
  type: z.enum(STOP_TYPES),
  note: z.string().describe("One short sentence: why go, what to order or see"),
  cost: z.number().describe("Cost for the whole group in the trip currency; 0 if free"),
  lat: z.number().describe("Approximate latitude of the place"),
  lng: z.number().describe("Approximate longitude of the place"),
});

export const DaySchema = z.object({
  title: z.string().describe("Max 6 words"),
  area: z.string().describe("Neighbourhood or region"),
  crowd: z.number().describe("1 quiet, 2 light, 3 moderate, 4 busy, 5 packed"),
  cost: z.number().describe("Total cost of the day for the group"),
  tip: z.string().describe("One practical tip"),
  stops: z.array(StopSchema),
});

export const TravelOptionSchema = z.object({
  mode: z.enum(TRAVEL_MODES),
  title: z.string().describe("Short, specific, e.g. Overnight train on the Konkan line"),
  hours: z.number().describe("One-way door-to-door hours, including getting to the station or airport"),
  cost: z.number().describe("Round-trip cost for the whole group in the trip currency"),
  note: z.string().describe("One sentence: where you arrive and anything worth knowing"),
});
export type TravelOption = z.infer<typeof TravelOptionSchema>;

export const TripSchema = z.object({
  headline: z.string().describe("Plain title naming the trip's main draws, max 8 words, no full stop. Not a slogan"),
  summary: z.string().describe("One sentence"),
  travel: z
    .object({
      options: z.array(TravelOptionSchema).describe("2-4 realistic ways to make the trip, one per mode"),
      chosen: z.number().describe("Index in options of the one the days are planned around"),
    })
    .nullable()
    .describe("Ways to get from the home city to the destination and back, or null if no home city was given"),
  budget: z.object({
    breakdown: z.array(z.object({ label: z.string(), amount: z.number() })).describe("Spending at the destination; excludes travel to and from it"),
    note: z.string(),
  }),
  crowd: z.object({
    headline: z.string().describe("Plain summary of how crowded it will be, max 7 words, no full stop"),
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

export type PlanEvent =
  | { type: "progress"; days: number; stage: "thinking" | "crowds" | "days" | "gallery" | "places" }
  /** cachedAt is set when the plan was reused from an identical earlier request instead of asking Claude again. */
  | { type: "done"; trip: Trip; cachedAt?: string }
  | { type: "error"; message: string };
