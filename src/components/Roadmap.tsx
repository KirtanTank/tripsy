"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { Car, Footprints, Info, Map, Plane, Route } from "lucide-react";
import { useLenis } from "lenis/react";
import clsx from "clsx";
import type { Day, TripRequest } from "@/lib/schema";
import { addDays, fmt, parseISO } from "@/lib/dates";
import { LEVELS, level, mapsUrl, money, num, photosUrl, routeUrl } from "@/lib/format";
import { STOP_META, isPlace } from "./icons";
import { distanceKm, formatKm, hasCoords, hopHint, type Coords } from "@/lib/geo";
import { PlacePhoto } from "./PlacePhoto";
import { SectionHead } from "./Reveal";

const ease = [0.22, 1, 0.36, 1] as const;

export function Roadmap({ request, days }: { request: TripRequest; days: Day[] }) {
  const lineRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(1);
  const lenis = useLenis();
  const { scrollYProgress } = useScroll({ target: lineRef, offset: ["start 65%", "end 65%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28 });
  const planeTop = useTransform(progress, (p) => `${p * 100}%`);

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-day]");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(Number((e.target as HTMLElement).dataset.day))),
      { rootMargin: "-45% 0px -50% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [days]);

  // Keep the active chip visible in the horizontally scrolling day bar.
  useEffect(() => {
    const chip = navRef.current?.querySelector<HTMLElement>(`[data-chip="${active}"]`);
    chip?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [active]);

  const jump = (n: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(`day-${n}`);
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -140 });
    else el.scrollIntoView();
  };

  return (
    <section id="roadmap" className="mt-24 scroll-mt-16 bg-ink pt-24 pb-28 text-on-ink md:mt-32 md:pt-28">
      <div className="gutter mx-auto max-w-[1240px]">
        <SectionHead title="Your days" dark />

        <nav
          ref={navRef}
          aria-label="Jump to a day"
          className="no-scrollbar sticky top-[calc(env(safe-area-inset-top)+64px)] z-20 -mx-4 mt-10 flex gap-2 overflow-x-auto bg-ink/95 px-4 py-3 backdrop-blur-md"
        >
          {days.map((d, i) => (
            <a
              key={i}
              href={`#day-${i + 1}`}
              data-chip={i + 1}
              onClick={jump(i + 1)}
              aria-current={active === i + 1 ? "true" : undefined}
              className={clsx(
                "relative inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-bold transition-colors",
                active === i + 1 ? "text-on-accent" : "bg-ink-2 text-on-ink"
              )}
            >
              {active === i + 1 && <motion.span layoutId="day-chip" className="absolute inset-0 -z-0 rounded-full bg-accent" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />}
              <span className="relative">Day {i + 1}</span>
              <span className={clsx("relative font-medium", active === i + 1 ? "text-on-accent/80" : "text-on-ink-muted")}>{d.area}</span>
            </a>
          ))}
        </nav>

        <div ref={lineRef} className="relative mt-10 md:pl-16">
          <div aria-hidden="true" className="absolute top-0 bottom-0 left-[22px] hidden w-1 rounded bg-ink-2 md:block" />
          <motion.div aria-hidden="true" className="absolute top-0 bottom-0 left-[22px] hidden w-1 origin-top rounded bg-accent md:block" style={{ scaleY: progress }} />
          <motion.div aria-hidden="true" className="absolute left-[24px] z-10 hidden -translate-x-1/2 -translate-y-1/2 md:block" style={{ top: planeTop }}>
            <span className="grid size-9 place-items-center rounded-full bg-on-ink text-ink shadow-lg">
              <Plane size={18} className="rotate-90" />
            </span>
          </motion.div>

          <div className="flex flex-col gap-12">
            {days.map((d, i) => (
              <DayCard key={i} day={d} n={i + 1} request={request} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DayCard({ day, n, request }: { day: Day; n: number; request: TripRequest }) {
  const date = addDays(parseISO(request.start), n - 1);
  const l = level(day.crowd);
  const places = day.stops.filter((s) => isPlace(s.type));
  const route = places.length > 1 ? routeUrl(places.map((s) => `${s.name}, ${request.dest}`)) : "";
  const cur = request.currency;
  // Distance from the previous stop that has a map position (stops without one are skipped).
  const coords: (Coords | null)[] = day.stops.map((s) => (hasCoords({ lat: s.lat, lon: s.lng }) ? { lat: s.lat, lon: s.lng } : null));
  const hops = coords.map((c, j) => {
    const prev = j > 0 ? coords[j - 1] : null;
    return c && prev ? distanceKm(prev, c) : null;
  });
  const totalKm = hops.reduce<number>((a, h) => a + (h ?? 0), 0);

  return (
    <motion.article
      id={`day-${n}`}
      data-day={n}
      className="relative scroll-mt-36"
      initial={{ opacity: 0, x: 60 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-15% 0px" }}
      transition={{ duration: 0.9, ease }}
    >
      <motion.div
        aria-hidden="true"
        className="absolute top-6 -left-16 hidden size-11 place-items-center rounded-full bg-accent font-display text-[19px] font-extrabold text-on-accent shadow-[0_0_0_6px_var(--ink)] md:grid"
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true, margin: "-15% 0px" }}
        transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
      >
        {n}
      </motion.div>
      <div className="flex flex-wrap overflow-hidden rounded-[28px] bg-bg text-fg">
        <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-5 p-5 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="text-sm font-semibold text-muted">
                Day {n} · {fmt(date, { weekday: "short", month: "short", day: "numeric" })} · {day.area}
              </span>
              <h3 className="m-0 text-[clamp(26px,3vw,34px)] leading-[1.05] font-extrabold">{day.title}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex h-8 items-center rounded-full px-3 text-[13px] font-bold" style={{ background: `var(--c${l})`, color: l >= 4 ? "var(--c-fg-hi)" : "var(--c-fg-lo)" }}>
                {LEVELS[l - 1]}
              </span>
              {num(day.cost) > 0 && <span className="inline-flex h-8 items-center rounded-full border border-line bg-surface px-3 text-[13px] font-bold tabular-nums">{money(num(day.cost), cur)}</span>}
              {totalKm > 0 && (
                <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-[13px] font-bold tabular-nums" title="Total distance between today's stops, straight line">
                  <Route size={14} /> {formatKm(totalKm)}
                </span>
              )}
            </div>
          </div>

          <motion.ol
            className="m-0 list-none p-0"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-10% 0px" }}
            variants={{ show: { transition: { staggerChildren: 0.09, delayChildren: 0.25 } } }}
          >
            {day.stops.map((s, j) => {
              const meta = STOP_META[s.type] ?? STOP_META.sight;
              const Icon = meta.icon;
              const hop = hops[j];
              const hint = hop !== null ? hopHint(hop) : null;
              const HopIcon = hint?.mode === "walk" ? Footprints : Car;
              return (
                <motion.li
                  key={j}
                  variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } } }}
                  className="border-t border-line py-3.5"
                >
                  {hop !== null && hint && (
                    <div className="mb-3 flex items-center gap-3 sm:gap-4">
                      <span className="w-11 shrink-0 sm:w-14" aria-hidden="true" />
                      <span className="flex w-10 shrink-0 justify-center" aria-hidden="true">
                        <motion.span
                          className="block h-7 w-0 origin-top border-l-2 border-dashed border-muted/50"
                          initial={{ scaleY: 0 }}
                          whileInView={{ scaleY: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.5, delay: 0.3 }}
                        />
                      </span>
                      <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full bg-surface-2 px-3 py-1 text-[13px] font-semibold text-muted">
                        <HopIcon size={14} aria-hidden="true" />
                        <span className="tabular-nums">{formatKm(hop)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{hint.text}</span>
                        <span className="sr-only">from the previous stop</span>
                        <a
                          className="text-teal hover:underline"
                          href={`https://www.google.com/maps/dir/?api=1&origin=${coords[j - 1]!.lat},${coords[j - 1]!.lon}&destination=${coords[j]!.lat},${coords[j]!.lon}&travelmode=${hint.mode === "walk" ? "walking" : "driving"}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Directions ↗
                        </a>
                      </span>
                    </div>
                  )}
                  <div className="flex gap-3 sm:gap-4">
                  <span className="w-11 shrink-0 pt-2.5 text-sm font-bold text-muted tabular-nums sm:w-14">{s.time}</span>
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl text-[#0E1B2C]" style={{ background: meta.tint }} aria-hidden="true">
                    <Icon size={19} />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                      <strong className="text-[17px]">{s.name}</strong>
                      <em className="text-xs font-semibold text-muted not-italic">{meta.label}</em>
                    </div>
                    <span className="text-sm text-muted">{s.note}</span>
                    {isPlace(s.type) && (
                      <span className="mt-0.5 flex gap-4 text-[13px] font-semibold">
                        <a className="text-teal hover:underline" href={mapsUrl(`${s.name}, ${request.dest}`)} target="_blank" rel="noopener noreferrer">
                          Map ↗
                        </a>
                        <a className="text-teal hover:underline" href={photosUrl(`${s.name} ${request.dest}`)} target="_blank" rel="noopener noreferrer">
                          Photos ↗
                        </a>
                      </span>
                    )}
                  </div>
                  <span className="max-w-[110px] shrink-0 pt-2.5 text-right text-sm font-bold tabular-nums">{num(s.cost) > 0 ? money(num(s.cost), cur) : "Free"}</span>
                  </div>
                </motion.li>
              );
            })}
          </motion.ol>

          {day.tip && (
            <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 text-sm">
              <Info size={19} className="mt-px shrink-0 text-teal" aria-hidden="true" />
              <span>{day.tip}</span>
            </div>
          )}
          {route && (
            <a href={route} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 self-start rounded-full border border-line bg-surface px-5 text-sm font-bold hover:border-muted">
              <Map size={17} /> Open day {n} route in Google Maps ↗
            </a>
          )}
        </div>

        {places.length > 0 && (
          <div className="grid min-w-0 flex-[1_1_300px] auto-rows-[150px] grid-cols-2 gap-2 bg-surface-2 p-3">
            {places.slice(0, 3).map((s, j) => (
              <PlacePhoto key={s.name} place={s.name} dest={request.dest} type={s.type} index={n * 3 + j} className={j === 0 ? "col-span-2" : ""} />
            ))}
          </div>
        )}
      </div>
    </motion.article>
  );
}
