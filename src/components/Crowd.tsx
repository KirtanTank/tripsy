"use client";

import { motion } from "motion/react";
import { CalendarClock } from "lucide-react";
import type { Trip, TripRequest } from "@/lib/schema";
import { calendarDates, fmt, parseISO } from "@/lib/dates";
import { LEVELS, clamp, level, num } from "@/lib/format";
import { SectionHead } from "./Reveal";

const cellStyle = (l: number) => ({ background: `var(--c${l})`, color: l >= 4 ? "var(--c-fg-hi)" : "var(--c-fg-lo)" });
const HOURS = ["6a", "10a", "2p", "6p", "8p"];

export function Crowd({ request, trip, onUseDates }: { request: TripRequest; trip: Trip; onUseDates: (start: string, end: string) => void }) {
  const dates = calendarDates(request.start, request.end);
  const levels = dates.map((_, i) => level(trip.crowd.calendar[i]));
  const lead = (parseISO(dates[0]).getUTCDay() + 6) % 7;
  const inTrip = (d: string) => d >= request.start && d <= request.end;
  const tripLv = levels.filter((_, i) => inTrip(dates[i]));
  const avg = tripLv.length ? Math.round(tripLv.reduce((a, b) => a + b, 0) / tripLv.length) : 3;
  const first = parseISO(dates[0]);
  const last = parseISO(dates[dates.length - 1]);
  const monthLabel =
    fmt(first, { month: "long" }) === fmt(last, { month: "long" })
      ? `${fmt(first, { month: "long" })} ${last.getUTCFullYear()}`
      : `${fmt(first, { month: "long" })} – ${fmt(last, { month: "long" })} ${last.getUTCFullYear()}`;

  const alt = trip.crowd.alternative;
  const altOk = !!alt && /^\d{4}-\d{2}-\d{2}$/.test(alt.start) && /^\d{4}-\d{2}-\d{2}$/.test(alt.end) && alt.end >= alt.start;
  const hours = trip.crowd.bestTime.levels.slice(0, 15).map((v) => clamp(num(v), 3, 100));
  const minH = hours.length ? Math.min(...hours) : 0;

  return (
    <section id="crowd" className="gutter mx-auto max-w-[1240px] scroll-mt-16 pt-24 md:pt-32">
      <SectionHead kicker="Crowd forecast" title={trip.crowd.headline || `${LEVELS[avg - 1]} on your dates`} lede={trip.crowd.summary} />

      <div className="mt-12 flex flex-wrap items-stretch gap-4">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-5 rounded-2xl border border-line bg-surface p-5 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="m-0 text-[22px] font-bold">{monthLabel}</h3>
            <div className="flex items-center gap-1.5 text-[13px] text-muted" aria-hidden="true">
              Quiet
              {[1, 2, 3, 4, 5].map((l) => (
                <i key={l} className="size-4 rounded-[5px]" style={{ background: `var(--c${l})` }} />
              ))}
              Packed
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold text-muted md:gap-2" aria-hidden="true">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div
            className="grid grid-cols-7 gap-1.5 md:gap-2"
            role="img"
            aria-label={`Crowd forecast from ${fmt(first, { month: "short", day: "numeric" })} to ${fmt(last, { month: "short", day: "numeric" })}. Your dates average ${LEVELS[avg - 1].toLowerCase()}.`}
          >
            {Array.from({ length: lead }, (_, i) => (
              <span key={"b" + i} />
            ))}
            {dates.map((d, i) => {
              const dt = parseISO(d);
              const l = levels[i];
              const sel = inTrip(d);
              return (
                <motion.div
                  key={d}
                  title={`${fmt(dt, { weekday: "short", month: "short", day: "numeric" })}: ${LEVELS[l - 1]}`}
                  initial={{ opacity: 0, scale: 0.6 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "-5% 0px" }}
                  transition={{ delay: 0.015 * i, type: "spring", bounce: 0.4, duration: 0.6 }}
                  className={`flex aspect-[1.15] flex-col justify-between rounded-[11px] px-2 py-1.5 text-[13px] leading-none font-bold md:px-2.5 md:py-2 md:text-[15px] ${sel ? "ring-[3px] ring-fg" : ""}`}
                  style={cellStyle(l)}
                >
                  <span className="tabular-nums">{dt.getUTCDate()}</span>
                  <small className="hidden text-[10px] font-semibold uppercase opacity-85 sm:block">{i === 0 || dt.getUTCDate() === 1 ? fmt(dt, { month: "short" }) : LEVELS[l - 1]}</small>
                </motion.div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
            <span className="flex items-center gap-2">
              <span className="size-4 rounded-[5px] ring-2 ring-fg" aria-hidden="true" /> Your dates
            </span>
            <span>AI estimate from season, holidays and events</span>
          </div>
          {trip.crowd.reasons.length > 0 && (
            <ul className="m-0 flex flex-col gap-1 pl-5 text-sm text-muted">
              {trip.crowd.reasons.slice(0, 4).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          {altOk && (
            <div className="relative flex flex-col gap-3 overflow-hidden rounded-2xl bg-ink p-7 text-on-ink">
              <span className="relative text-sm font-semibold text-ink-accent">Quieter option</span>
              <p className="relative m-0 font-display text-[26px] leading-tight font-bold">
                Go {fmt(parseISO(alt!.start), { month: "short", day: "numeric" })} – {fmt(parseISO(alt!.end), { month: "short", day: "numeric" })} instead.
              </p>
              <p className="relative m-0 text-on-ink-muted">{alt!.why}</p>
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => onUseDates(alt!.start, alt!.end)}
                className="relative inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-on-ink px-5 font-bold text-ink"
              >
                <CalendarClock size={17} /> Use these dates
              </motion.button>
            </div>
          )}
          {hours.length > 0 && (
            <div className="flex flex-1 flex-col gap-4 rounded-2xl border border-line bg-surface p-7">
              <div>
                <h3 className="m-0 text-xl font-bold">{trip.crowd.bestTime.place}, by the hour</h3>
                <span className="text-sm text-muted">Best window: {trip.crowd.bestTime.window}</span>
              </div>
              <div className="flex h-36 items-end gap-[5px]" role="img" aria-label={`${trip.crowd.bestTime.place} is quietest ${trip.crowd.bestTime.window}.`}>
                {hours.map((v, i) => (
                  <motion.div
                    key={i}
                    className="flex-1 origin-bottom rounded-t-md rounded-b-sm"
                    style={{ height: `${v}%`, background: v <= minH + 12 ? "var(--teal)" : "var(--bar)" }}
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.04, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted">
                {HOURS.map((h) => (
                  <span key={h}>{h}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
