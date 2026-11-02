// Rush meter: real signals of how busy the trip is getting, from public APIs.
// These are signals, never a headcount: nobody publishes how many people are travelling somewhere.

import { addDays, parseISO, toISO } from "./dates";

/** How many days before the From date the rush window opens. */
export const RUSH_DAYS = 5;

export type SignalStatus = "live" | "no-key" | "unavailable";

export type RoadProvider = "mapbox" | "tomtom";

/** How often the page re-reads the signals on its own. A manual refresh always fetches fresh data. */
export const RUSH_REFRESH_MIN = 30;

export type RoadSignal = {
  status: SignalStatus;
  provider: RoadProvider | null;
  /** Mapbox only: drive time on the real route now, and on a typical day, in minutes. */
  minutes?: number;
  typicalMinutes?: number;
  km?: number;
  /** Extra travel time over normal, as a fraction (0.18 = 18% slower; Mapbox can go negative when it's lighter than usual). */
  delay: number;
  /** Average current speed over free-flow speed, 0..1. */
  flow: number;
  /** TomTom only: how many points along the way were sampled. */
  points: number;
  /** Why there's no live reading, when status isn't live. */
  reason?: string;
};

export type AirSignal = {
  status: SignalStatus;
  /** Aircraft in the sky within ~150 km of the destination. */
  overhead: number;
  /** Of those, how many are low (under 3.5 km), so likely landing or taking off nearby. */
  low: number;
};

export type InterestSignal = {
  status: SignalStatus;
  article: string;
  /** Daily Wikipedia pageviews for the days shown. */
  days: { date: string; views: number }[];
  /** Median daily views over the 60 days before, for comparison. */
  baseline: number;
  /** Latest shown day compared with the baseline (2.1 = 2.1× usual). */
  ratio: number;
  /** True when the window is still in the future, so these are the latest days instead. */
  latest: boolean;
};

export type RushData = {
  updatedAt: string;
  window: { start: string; end: string };
  /** live: today is inside the window or the trip. preview: the window hasn't opened. past: the trip is over. */
  phase: "live" | "preview" | "past";
  road: RoadSignal;
  air: AirSignal;
  interest: InterestSignal;
  /** Which signals were answered from the cache instead of calling the API. */
  fromCache?: string[];
};

export function rushWindow(start: string) {
  const s = parseISO(start);
  return { start: toISO(addDays(s, -RUSH_DAYS)), end: toISO(addDays(s, -1)) };
}

export function rushPhase(start: string, end: string, today = toISO(new Date())): RushData["phase"] {
  if (today > end) return "past";
  if (today < rushWindow(start).start) return "preview";
  return "live";
}

/** Each signal on the 1..5 crowd scale (Quiet … Packed), or null without data. */
export const roadLevel = (r: RoadSignal) =>
  r.status !== "live" ? null : r.delay < 0.05 ? 1 : r.delay < 0.15 ? 2 : r.delay < 0.3 ? 3 : r.delay < 0.5 ? 4 : 5;
export const interestLevel = (i: InterestSignal) =>
  i.status !== "live" || !i.baseline ? null : i.ratio < 0.85 ? 1 : i.ratio < 1.1 ? 2 : i.ratio < 1.4 ? 3 : i.ratio < 2 ? 4 : 5;

/** Combines the live signals into one level. Air traffic has no baseline, so it's context only. */
export function rushLevel(d: RushData) {
  const ls = [roadLevel(d.road), interestLevel(d.interest)].filter((l): l is number => l !== null);
  return ls.length ? Math.round(ls.reduce((a, b) => a + b, 0) / ls.length) : null;
}
