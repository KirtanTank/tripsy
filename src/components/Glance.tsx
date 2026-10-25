"use client";

import { motion } from "motion/react";
import type { Trip, TripRequest } from "@/lib/schema";
import { daysBetween, fmt, parseISO } from "@/lib/dates";
import { money, num } from "@/lib/format";
import { CountUp, Reveal, SectionHead } from "./Reveal";

const SEG = ["var(--ink)", "#C8762A", "var(--teal)", "#7B6FD0", "var(--bar)", "#B0306A", "#3E6E8C"];

export function Glance({ request, trip, isSample }: { request: TripRequest; trip: Trip; isSample: boolean }) {
  const cur = request.currency;
  const nDays = daysBetween(request.start, request.end);
  const stops = trip.days.reduce((a, d) => a + d.stops.length, 0);
  const breakdown = trip.budget.breakdown.map((b) => ({ ...b, amount: Math.max(0, num(b.amount)) })).filter((b) => b.amount > 0);
  const planned = breakdown.reduce((a, b) => a + b.amount, 0) || trip.days.reduce((a, d) => a + num(d.cost), 0);
  const over = planned - request.budget;
  const perDay = planned / request.travelers / Math.max(1, nDays);
  const m = (n: number) => money(n, cur);

  const stats = [
    { k: "Days", v: nDays, f: (n: number) => String(Math.round(n)), s: `${fmt(parseISO(request.start), { month: "short", day: "numeric" })} – ${fmt(parseISO(request.end), { month: "short", day: "numeric", year: "numeric" })}` },
    { k: "Stops", v: stops, f: (n: number) => String(Math.round(n)), s: `${request.pace} pace` },
    { k: "Per person, per day", v: perDay, f: m, s: `${request.travelers} traveler${request.travelers > 1 ? "s" : ""}` },
    { k: "Planned spend", v: planned, f: m, s: over > 0 ? `${m(over)} over your ${m(request.budget)}` : `${m(request.budget - planned)} left of ${m(request.budget)}`, warn: over > 0 },
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

      {breakdown.length > 0 && (
        <Reveal className="mt-4 flex flex-col gap-4 rounded-3xl border border-line bg-surface p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="m-0 text-[22px] font-bold">Where your money goes</h3>
            <span className="text-sm text-muted">{trip.budget.note}</span>
          </div>
          <div className="flex h-5 gap-[3px] overflow-hidden rounded-full" aria-hidden="true">
            {breakdown.map((b, i) => (
              <motion.div
                key={b.label}
                style={{ flex: `${b.amount} 1 0`, background: SEG[i % SEG.length] }}
                className="origin-left"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              />
            ))}
          </div>
          <ul className="m-0 flex list-none flex-wrap gap-x-7 gap-y-2 p-0 text-sm">
            {breakdown.map((b, i) => (
              <li key={b.label} className="flex items-center gap-2">
                <span className="size-3 rounded" style={{ background: SEG[i % SEG.length] }} aria-hidden="true" />
                <span className="text-muted">{b.label}</span>
                <strong className="tabular-nums">{m(b.amount)}</strong>
              </li>
            ))}
          </ul>
        </Reveal>
      )}
    </section>
  );
}
