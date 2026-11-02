import type { TravelMode, TravelOption } from "./schema";
import { num } from "./format";

export const MODE_LABEL: Record<TravelMode, string> = { flight: "Flight", train: "Train", bus: "Bus", drive: "Drive" };

export const formatHours = (h: number) => {
  const mins = Math.max(5, Math.round((num(h) * 60) / 5) * 5);
  if (mins < 60) return `${mins} min`;
  const m = mins % 60;
  return `${Math.floor(mins / 60)} h${m ? ` ${m} min` : ""}`;
};

/**
 * Picks the option that best fits the visitor's time-vs-money preference.
 * Time and cost are each scaled 0..1 across the options, then weighted by the slider
 * (0 = only time counts, 4 = only money counts). Ties go to the faster option.
 */
export function recommend(options: TravelOption[], priority: number): number {
  if (options.length === 0) return -1;
  const hours = options.map((o) => num(o.hours));
  const costs = options.map((o) => num(o.cost));
  const span = (xs: number[]) => Math.max(...xs) - Math.min(...xs) || 1;
  const wMoney = Math.min(4, Math.max(0, priority)) / 4;
  const score = (i: number) =>
    (1 - wMoney) * ((hours[i] - Math.min(...hours)) / span(hours)) + wMoney * ((costs[i] - Math.min(...costs)) / span(costs));
  let best = 0;
  for (let i = 1; i < options.length; i++) {
    const d = score(i) - score(best);
    if (d < -1e-9 || (Math.abs(d) <= 1e-9 && hours[i] < hours[best])) best = i;
  }
  return best;
}

export const fastestIndex = (o: TravelOption[]) => o.reduce((b, x, i) => (num(x.hours) < num(o[b].hours) ? i : b), 0);
export const cheapestIndex = (o: TravelOption[]) => o.reduce((b, x, i) => (num(x.cost) < num(o[b].cost) ? i : b), 0);

/** Why a mode is a poor fit for this distance, or null if it's reasonable. Still selectable either way. */
export function modeWarning(mode: TravelMode, km: number | null): string | null {
  if (km === null) return null;
  if ((mode === "drive" || mode === "bus") && km > 1500) return "Very long by road";
  if (mode === "train" && km > 2500) return "Days by rail";
  if (mode === "flight" && km < 150) return "Likely slower than road";
  return null;
}
