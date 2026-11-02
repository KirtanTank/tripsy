"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { ArrowDown, CalendarDays, MapPin, Pencil, Sparkles, Wallet } from "lucide-react";
import type { TripRequest } from "@/lib/schema";
import { fmt, parseISO, daysBetween } from "@/lib/dates";
import { money } from "@/lib/format";
import { distanceKm, formatKm, hasCoords } from "@/lib/geo";

const HEADLINE = ["Pick", "a", "place.", "We'll", "draw", "the", "road."];
const ease = [0.22, 1, 0.36, 1] as const;

function Layer({ progress, depth, children }: { progress: MotionValue<number>; depth: number; children: React.ReactNode }) {
  const y = useTransform(progress, [0, 1], [0, depth]);
  return (
    <motion.g style={{ y }}>{children}</motion.g>
  );
}

export function Hero({ request, isSample, onPlan, onExplore }: { request: TripRequest; isSample: boolean; onPlan: () => void; onExplore: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -140]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const sunY = useTransform(scrollYProgress, [0, 1], [0, 260]);
  const sunScale = useTransform(scrollYProgress, [0, 1], [1, 1.25]);
  const n = daysBetween(request.start, request.end);
  const km = request.from && hasCoords(request.fromCoords) && hasCoords(request.destCoords) ? distanceKm(request.fromCoords, request.destCoords) : null;

  return (
    <section ref={ref} id="top" className="relative isolate flex min-h-[92svh] items-end overflow-hidden bg-ink text-on-ink">
      <svg aria-hidden="true" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 -z-10 size-full">
        <rect width="1440" height="900" fill="#0E1B2C" />
        <motion.g style={{ y: sunY, scale: sunScale }}>
          <motion.circle cx="1040" cy="320" r="230" fill="#E8562A" opacity=".12" animate={{ r: [220, 245, 220] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} />
          <motion.circle cx="1040" cy="320" r="150" fill="#E8562A" initial={{ cy: 520, opacity: 0 }} animate={{ cy: 320, opacity: 1 }} transition={{ duration: 1.6, ease }} />
        </motion.g>
        <motion.g animate={{ x: [0, 60, 0] }} transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }} fill="#F6F5F1" opacity=".08">
          <ellipse cx="300" cy="200" rx="140" ry="22" />
          <ellipse cx="380" cy="180" rx="90" ry="18" />
          <ellipse cx="760" cy="140" rx="110" ry="16" />
        </motion.g>
        <Layer progress={scrollYProgress} depth={60}>
          <path d="M0 520 C 240 470, 420 510, 640 480 S 1100 450, 1440 500 L1440 900 L0 900Z" fill="#163049" />
        </Layer>
        <Layer progress={scrollYProgress} depth={110}>
          <path d="M0 590 C 300 550, 520 610, 820 570 S 1240 550, 1440 580 L1440 900 L0 900Z" fill="#0F5E63" />
          <g stroke="#F6F5F1" strokeWidth="2" opacity=".3" fill="none">
            <motion.path d="M880 620 h120" animate={{ x: [0, 30, 0] }} transition={{ duration: 5, repeat: Infinity }} />
            <motion.path d="M940 645 h180" animate={{ x: [0, -24, 0] }} transition={{ duration: 6, repeat: Infinity }} />
          </g>
        </Layer>
        <Layer progress={scrollYProgress} depth={160}>
          <path d="M0 670 C 260 650, 520 690, 760 660 S 1200 650, 1440 670 L1440 900 L0 900Z" fill="#0B7A75" />
        </Layer>
        <Layer progress={scrollYProgress} depth={220}>
          <path d="M0 760 C 300 740, 600 770, 900 750 S 1300 740, 1440 760 L1440 900 L0 900Z" fill="#E9D8B4" />
          <motion.g
            stroke="#0E1B2C"
            strokeWidth="7"
            fill="none"
            strokeLinecap="round"
            style={{ transformOrigin: "1250px 760px" }}
            animate={{ rotate: [-1.5, 1.5, -1.5] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            <path d="M1250 760 C 1260 670, 1280 610, 1320 550" />
            <path d="M1320 550 C 1270 540, 1230 560, 1210 590" />
            <path d="M1320 550 C 1360 530, 1400 540, 1420 570" />
            <path d="M1320 550 C 1310 510, 1280 490, 1250 490" />
            <path d="M1320 550 C 1350 510, 1390 500, 1415 510" />
          </motion.g>
        </Layer>
      </svg>

      <motion.div style={{ y: copyY, opacity: copyOpacity }} className="gutter mx-auto flex w-full max-w-[1240px] flex-col gap-6 pt-32 pb-16 md:pb-24">
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }} className="eyebrow m-0 text-ink-accent">
          Your trip, every hour of it
        </motion.p>
        <h1 className="m-0 max-w-[15ch] text-[clamp(46px,8.5vw,116px)] leading-[0.95] font-extrabold">
          {HEADLINE.map((w, i) => (
            <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
              <motion.span className="inline-block" initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ delay: 0.15 + i * 0.07, duration: 0.8, ease }}>
                {w}
                {i < HEADLINE.length - 1 ? " " : ""}
              </motion.span>
            </span>
          ))}
        </h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.8 }} className="m-0 max-w-[52ch] text-lg text-on-ink-muted md:text-xl">
          Tell us where, when and how much. Get a day-by-day roadmap with cafes, beaches and must-see spots, real photos, and how crowded it&apos;ll be on your dates.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.7, ease }} className="flex flex-wrap items-center gap-3">
          <motion.button
            type="button"
            onClick={onPlan}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex min-h-14 items-center gap-2.5 rounded-full bg-accent px-7 text-base font-bold text-on-accent shadow-[0_20px_50px_-12px] shadow-accent/60"
          >
            <Sparkles size={18} /> Plan your trip
          </motion.button>
          <button type="button" onClick={onExplore} className="inline-flex min-h-14 items-center gap-2 rounded-full px-5 font-semibold text-on-ink hover:bg-white/10">
            {isSample ? "Explore the example" : "See your roadmap"} <ArrowDown size={18} />
          </button>
        </motion.div>

        <motion.button
          type="button"
          onClick={onPlan}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          className="mt-4 flex max-w-full flex-wrap items-center gap-x-5 gap-y-2 self-start rounded-2xl border border-white/15 bg-[#0E1B2C]/75 px-5 py-3 text-left text-sm backdrop-blur-md hover:bg-[#0E1B2C]/90"
          aria-label="Edit trip details"
        >
          <span className="eyebrow w-full text-[11px] text-ink-accent">{isSample ? "Example trip" : "Your trip"}</span>
          <span className="inline-flex items-center gap-2">
            <MapPin size={15} className="text-ink-accent" />
            {request.from ? `${request.from.split(",")[0]} → ${request.dest.split(",")[0]}` : request.dest}
            {km !== null && <span className="text-on-ink-muted">· {formatKm(km)}</span>}
          </span>
          <span className="inline-flex items-center gap-2">
            <CalendarDays size={15} className="text-ink-accent" />
            {fmt(parseISO(request.start), { month: "short", day: "numeric" })} – {fmt(parseISO(request.end), { month: "short", day: "numeric" })} · {n} days
          </span>
          <span className="inline-flex items-center gap-2">
            <Wallet size={15} className="text-ink-accent" /> {money(request.budget, request.currency)}
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-on-ink">
            <Pencil size={14} /> Edit
          </span>
        </motion.button>
      </motion.div>

      <motion.div aria-hidden="true" className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 text-ink-accent md:block" animate={{ y: [0, 8, 0] }} transition={{ duration: 1.8, repeat: Infinity }}>
        <ArrowDown size={22} />
      </motion.div>
    </section>
  );
}
