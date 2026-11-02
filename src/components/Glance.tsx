"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bus, Car, Clock, Coins, Plane, RefreshCw, TrainFront, type LucideIcon } from "lucide-react";
import clsx from "clsx";
import { distanceKm, formatKm, hasCoords } from "@/lib/geo";
import { PRIORITY_LABELS, type TravelMode, type TravelOption, type Trip, type TripRequest } from "@/lib/schema";
import { daysBetween, fmt, parseISO } from "@/lib/dates";
import { clamp, money, num } from "@/lib/format";
import { MODE_LABEL, cheapestIndex, fastestIndex, formatHours, recommend } from "@/lib/travel";
import { CountUp, Reveal, SectionHead } from "./Reveal";

/** Travel always uses teal; the rest of the budget uses neutrals so travel stands out. */
const TRAVEL = "var(--teal)";
const SEG = ["var(--fg)", "#C8762A", "#7B6FD0", "#3E6E8C", "var(--bar)", "#B0306A"];
const MODE_ICON: Record<TravelMode, LucideIcon> = { flight: Plane, train: TrainFront, bus: Bus, drive: Car };

type Props = { request: TripRequest; trip: Trip; isSample: boolean; onReplan: (mode: TravelMode) => void };

export function Glance({ request, trip, isSample, onReplan }: Props) {
  const cur = request.currency;
  const m = (n: number) => money(n, cur);
  const nDays = daysBetween(request.start, request.end);
  const stops = trip.days.reduce((a, d) => a + d.stops.length, 0);

  const options = request.from ? (trip.travel?.options ?? []).filter((o) => MODE_ICON[o.mode]) : [];
  const chosen = options.length ? clamp(Math.round(num(trip.travel?.chosen)), 0, options.length - 1) : -1;
  const travelCost = chosen >= 0 ? Math.max(0, num(options[chosen].cost)) : 0;

  const breakdown = trip.budget.breakdown.map((b) => ({ ...b, amount: Math.max(0, num(b.amount)) })).filter((b) => b.amount > 0);
  const onTrip = breakdown.reduce((a, b) => a + b.amount, 0) || trip.days.reduce((a, d) => a + num(d.cost), 0);
  const total = onTrip + travelCost;
  const over = total - request.budget;
  const perDay = onTrip / request.travelers / Math.max(1, nDays);

  const stats = [
    { k: "Days", v: nDays, f: (n: number) => String(Math.round(n)), s: `${fmt(parseISO(request.start), { month: "short", day: "numeric" })} – ${fmt(parseISO(request.end), { month: "short", day: "numeric", year: "numeric" })}` },
    { k: "Stops", v: stops, f: (n: number) => String(Math.round(n)), s: `${request.pace} pace` },
    { k: "Per person, per day", v: perDay, f: m, s: travelCost ? "At the destination" : `${request.travelers} traveler${request.travelers > 1 ? "s" : ""}` },
    { k: travelCost ? "Total with travel" : "Planned spend", v: total, f: m, s: over > 0 ? `${m(over)} over your ${m(request.budget)}` : `${m(request.budget - total)} left of ${m(request.budget)}`, warn: over > 0 },
  ];

  return (
    <section id="glance" className="gutter mx-auto max-w-[1240px] scroll-mt-16 pt-24 pb-6 md:pt-32">
      <SectionHead
        eyebrow={`${request.dest} at a glance`}
        title={trip.headline}
        aside={
          <Reveal delay={0.2} y={20} className="flex max-w-[380px] flex-col gap-3">
            {isSample && <span className="self-start rounded-full bg-surface-2 px-3 py-1 text-[13px] font-bold text-muted">Example trip</span>}
            <p className="m-0 text-[17px] text-muted">{trip.summary}</p>
          </Reveal>
        }
      />

      <div className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.k}
            initial={{ opacity: 0, y: 30, rotate: i % 2 ? 2 : -2 }}
            whileInView={{ opacity: 1, y: 0, rotate: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ delay: i * 0.08, type: "spring", bounce: 0.35, duration: 0.8 }}
            whileHover={{ y: -4 }}
            className="flex min-w-0 flex-col gap-1.5 rounded-3xl border border-line bg-surface p-5 md:p-6"
          >
            <span className="eyebrow text-[11px] text-muted">{s.k}</span>
            <span className="truncate font-display text-[clamp(28px,4vw,42px)] leading-none font-extrabold tabular-nums">
              <CountUp value={s.v} format={s.f} />
            </span>
            <span className={`text-sm ${s.warn ? "font-bold text-accent" : "text-muted"}`}>{s.s}</span>
          </motion.div>
        ))}
      </div>

      {options.length > 0 && <TravelCard request={request} options={options} chosen={chosen} onReplan={onReplan} />}

      {(breakdown.length > 0 || travelCost > 0) && (
        <Reveal className="mt-4 flex flex-col gap-4 rounded-3xl border border-line bg-surface p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="m-0 text-[22px] font-bold">Where your money goes</h3>
            <span className={clsx("text-sm font-bold tabular-nums", over > 0 ? "text-accent" : "text-muted")}>
              {m(total)} of {m(request.budget)}
            </span>
          </div>

          {travelCost > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 px-4 py-3"
              style={{ borderColor: TRAVEL, background: `color-mix(in srgb, ${TRAVEL} 12%, transparent)` }}
            >
              <span className="inline-flex min-w-0 items-center gap-2 font-semibold">
                {(() => {
                  const Icon = MODE_ICON[options[chosen].mode];
                  return <Icon size={18} className="shrink-0 text-teal" aria-hidden="true" />;
                })()}
                <span>
                  Travel <span className="font-medium text-muted">· {request.from.split(",")[0]} ⇄ {request.dest.split(",")[0]}, {MODE_LABEL[options[chosen].mode].toLowerCase()}, {request.travelers} {request.travelers > 1 ? "people" : "person"}</span>
                </span>
              </span>
              <strong className="font-display text-xl font-extrabold text-teal tabular-nums">{m(travelCost)}</strong>
            </motion.div>
          )}

          <div className="flex h-5 gap-[3px] overflow-hidden rounded-full" aria-hidden="true">
            {[...(travelCost > 0 ? [{ label: "Travel", amount: travelCost, color: TRAVEL }] : []), ...breakdown.map((b, i) => ({ ...b, color: SEG[i % SEG.length] }))].map((b, i) => (
              <motion.div
                key={b.label}
                style={{ flex: `${b.amount} 1 0`, background: b.color }}
                className="origin-left"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              />
            ))}
          </div>

          <ul className="m-0 flex list-none flex-wrap gap-x-7 gap-y-2 p-0 text-sm">
            {travelCost > 0 && (
              <li className="flex items-center gap-2">
                <span className="size-3 rounded" style={{ background: TRAVEL }} aria-hidden="true" />
                <span className="font-bold text-teal">Travel</span>
                <strong className="text-teal tabular-nums">{m(travelCost)}</strong>
              </li>
            )}
            {breakdown.map((b, i) => (
              <li key={b.label} className="flex items-center gap-2">
                <span className="size-3 rounded" style={{ background: SEG[i % SEG.length] }} aria-hidden="true" />
                <span className="text-muted">{b.label}</span>
                <strong className="tabular-nums">{m(b.amount)}</strong>
              </li>
            ))}
          </ul>
          <p className="m-0 text-sm text-muted">
            {travelCost > 0 ? `${m(onTrip)} at the destination + ${m(travelCost)} travel. ` : ""}
            {trip.budget.note}
          </p>
        </Reveal>
      )}
    </section>
  );
}

/**
 * Ways to get there, side by side. The Recommended badge follows the visitor's time-vs-money
 * slider and updates instantly; switching the planned option asks Claude to re-plan.
 */
function TravelCard({ request, options, chosen, onReplan }: { request: TripRequest; options: TravelOption[]; chosen: number; onReplan: (mode: TravelMode) => void }) {
  const [priority, setPriority] = useState(request.priority ?? 2);
  const rec = recommend(options, priority);
  const fastest = fastestIndex(options);
  const cheapest = cheapestIndex(options);
  const km = hasCoords(request.fromCoords) && hasCoords(request.destCoords) ? distanceKm(request.fromCoords, request.destCoords) : null;
  const cur = request.currency;
  const short = (s: string) => s.split(",")[0];

  const why = (() => {
    const r = options[rec];
    const other = rec === fastest ? options[cheapest] : options[fastest];
    if (!other || other === r) return `${MODE_LABEL[r.mode]} is both the fastest and the cheapest way.`;
    const dh = formatHours(Math.abs(num(r.hours) - num(other.hours)));
    const dc = money(Math.abs(num(r.cost) - num(other.cost)), cur);
    if (rec === fastest) return `${MODE_LABEL[r.mode]} saves ${dh} each way over the ${MODE_LABEL[other.mode].toLowerCase()}, for ${dc} more.`;
    if (rec === cheapest) return `${MODE_LABEL[r.mode]} saves ${dc} over the ${MODE_LABEL[other.mode].toLowerCase()}, and takes ${dh} longer each way.`;
    return `${MODE_LABEL[r.mode]} is the middle ground: ${money(Math.abs(num(r.cost) - num(options[cheapest].cost)), cur)} more than the cheapest, ${formatHours(Math.abs(num(r.hours) - num(options[cheapest].hours)))} quicker.`;
  })();

  return (
    <Reveal className="mt-4 flex flex-col gap-5 overflow-hidden rounded-3xl bg-ink p-6 text-on-ink md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="eyebrow text-[12px] text-ink-accent">Getting there</span>
        {km !== null && <span className="rounded-full bg-ink-2 px-3 py-1 text-sm font-bold tabular-nums">{formatKm(km)}</span>}
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
        <strong className="max-w-[35%] truncate font-display text-[clamp(20px,3vw,30px)] font-extrabold">{short(request.from)}</strong>
        <svg viewBox="0 0 300 60" className="h-12 min-w-0 flex-1 overflow-visible" fill="none" aria-hidden="true">
          <path d="M6 50 Q 150 -20 294 50" stroke="var(--ink-2)" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" />
          <motion.path
            d="M6 50 Q 150 -20 294 50"
            stroke="var(--accent)"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          />
          <circle cx="6" cy="50" r="6" fill="var(--ink-accent)" />
          <circle cx="294" cy="50" r="6" fill="var(--accent)" />
        </svg>
        <strong className="max-w-[35%] truncate text-right font-display text-[clamp(20px,3vw,30px)] font-extrabold">{short(request.dest)}</strong>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl bg-ink-2 px-5 py-4">
        <label htmlFor="trip-priority" className="text-sm font-semibold">
          What matters more to you?
        </label>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-sm text-on-ink-muted">
            <Clock size={15} aria-hidden="true" /> Time
          </span>
          <input
            id="trip-priority"
            type="range"
            min={0}
            max={4}
            step={1}
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            aria-valuetext={PRIORITY_LABELS[priority]}
            className="budget flex-1"
            style={{ ["--fill" as string]: `${(priority / 4) * 100}%` }}
          />
          <span className="inline-flex items-center gap-1.5 text-sm text-on-ink-muted">
            <Coins size={15} aria-hidden="true" /> Money
          </span>
        </div>
        <span className="text-center text-sm font-bold">{PRIORITY_LABELS[priority]}</span>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,190px),1fr))] gap-3">
        {options.map((o, i) => {
          const Icon = MODE_ICON[o.mode];
          const isRec = i === rec;
          const facts = [i === fastest ? "Fastest" : "", i === cheapest ? "Cheapest" : ""].filter(Boolean);
          return (
            <motion.div
              key={o.mode + i}
              layout
              className={clsx("relative flex flex-col gap-2 rounded-2xl bg-ink p-4", isRec ? "ring-2 ring-accent" : "ring-1 ring-white/15")}
            >
              <div className="flex min-h-6 flex-wrap items-center gap-1.5">
                <AnimatePresence>
                  {isRec && (
                    <motion.span
                      layoutId="rec-badge"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-on-accent"
                    >
                      Recommended
                    </motion.span>
                  )}
                </AnimatePresence>
                {facts.map((f) => (
                  <span key={f} className="rounded-full bg-ink-2 px-2.5 py-0.5 text-xs font-semibold text-on-ink-muted">
                    {f}
                  </span>
                ))}
              </div>
              <strong className="inline-flex items-center gap-2 text-[17px]">
                <Icon size={18} aria-hidden="true" /> {MODE_LABEL[o.mode]}
              </strong>
              <span className="text-sm text-on-ink-muted">{o.title}</span>
              <span className="text-sm font-bold tabular-nums">
                {formatHours(o.hours)} each way · {money(num(o.cost), cur)}
              </span>
              <span className="text-xs text-on-ink-muted">{o.note}</span>
              <div className="mt-auto pt-1">
                {i === chosen ? (
                  <span className="text-xs font-bold text-ink-accent">Your plan uses this</span>
                ) : (
                  <button type="button" onClick={() => onReplan(o.mode)} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-white/20 px-3 text-xs font-bold hover:bg-white/10">
                    <RefreshCw size={13} aria-hidden="true" /> Re-plan with {MODE_LABEL[o.mode].toLowerCase()}
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.p key={why} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="m-0 text-on-ink-muted">
          {why}
          {rec !== chosen && <span className="text-on-ink"> Your current plan uses the {MODE_LABEL[options[chosen].mode].toLowerCase()}.</span>}
        </motion.p>
      </AnimatePresence>
    </Reveal>
  );
}
