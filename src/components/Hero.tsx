"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { ArrowDown, CalendarDays, MapPin, Pencil, Sparkles, Wallet } from "lucide-react";
import type { TripRequest } from "@/lib/schema";
import { fmt, parseISO, daysBetween } from "@/lib/dates";
import { money } from "@/lib/format";
import { distanceKm, formatKm, hasCoords } from "@/lib/geo";
import { sceneFor, type Scene } from "@/lib/scene";

const ease = [0.22, 1, 0.36, 1] as const;

function Layer({ progress, depth, children }: { progress: MotionValue<number>; depth: number; children: React.ReactNode }) {
  const y = useTransform(progress, [0, 1], [0, depth]);
  return <motion.g style={{ y }}>{children}</motion.g>;
}

function Coast({ p }: { p: MotionValue<number> }) {
  return (
    <>
      <Layer progress={p} depth={60}>
        <path d="M0 520 C 240 470, 420 510, 640 480 S 1100 450, 1440 500 L1440 900 L0 900Z" fill="#163049" />
      </Layer>
      <Layer progress={p} depth={110}>
        <path d="M0 590 C 300 550, 520 610, 820 570 S 1240 550, 1440 580 L1440 900 L0 900Z" fill="#0F5E63" />
        <g stroke="#F6F5F1" strokeWidth="2" opacity=".3" fill="none">
          <motion.path d="M880 620 h120" animate={{ x: [0, 30, 0] }} transition={{ duration: 5, repeat: Infinity }} />
          <motion.path d="M940 645 h180" animate={{ x: [0, -24, 0] }} transition={{ duration: 6, repeat: Infinity }} />
        </g>
      </Layer>
      <Layer progress={p} depth={160}>
        <path d="M0 670 C 260 650, 520 690, 760 660 S 1200 650, 1440 670 L1440 900 L0 900Z" fill="#0B7A75" />
      </Layer>
      <Layer progress={p} depth={220}>
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
    </>
  );
}

function Desert({ p }: { p: MotionValue<number> }) {
  return (
    <>
      <Layer progress={p} depth={50}>
        <path d="M0 560 C 200 500, 380 520, 560 540 S 980 470, 1440 530 L1440 900 L0 900Z" fill="#4A2E3A" />
      </Layer>
      <Layer progress={p} depth={100}>
        <path d="M0 620 C 260 580, 460 600, 700 630 S 1180 560, 1440 610 L1440 900 L0 900Z" fill="#8A4B36" />
        {/* A chhatri on the ridge: four pillars, a ledge and a dome. */}
        <g fill="#2A1B24" transform="translate(1110 548)">
          <rect x="-46" y="-6" width="92" height="8" />
          <rect x="-40" y="-40" width="6" height="34" />
          <rect x="-14" y="-40" width="6" height="34" />
          <rect x="8" y="-40" width="6" height="34" />
          <rect x="34" y="-40" width="6" height="34" />
          <rect x="-48" y="-48" width="96" height="9" />
          <path d="M-38 -48 C -38 -84, 38 -84, 38 -48Z" />
          <rect x="-2" y="-92" width="4" height="12" />
        </g>
      </Layer>
      <Layer progress={p} depth={160}>
        <path d="M0 700 C 240 660, 520 700, 780 680 S 1200 650, 1440 690 L1440 900 L0 900Z" fill="#C07A45" />
      </Layer>
      <Layer progress={p} depth={220}>
        <path d="M0 780 C 320 750, 620 790, 940 765 S 1300 750, 1440 770 L1440 900 L0 900Z" fill="#E2B57A" />
        <g stroke="#B9864F" strokeWidth="2" fill="none" opacity=".6">
          <path d="M140 820 c 40 -10, 80 -10, 120 0" />
          <path d="M520 835 c 50 -12, 100 -12, 150 0" />
        </g>
      </Layer>
    </>
  );
}

function Hills({ p }: { p: MotionValue<number> }) {
  const pine = (x: number, y: number, s: number) => <path key={x} d={`M${x} ${y} l${-18 * s} ${40 * s} h${12 * s} l${-14 * s} ${32 * s} h${40 * s} l${-14 * s} ${-32 * s} h${12 * s}Z`} />;
  return (
    <>
      <Layer progress={p} depth={40}>
        <path d="M0 560 L170 380 L300 500 L470 330 L640 520 L820 360 L1000 520 L1180 340 L1440 540 L1440 900 L0 900Z" fill="#1F3A55" />
        <g fill="#F6F5F1" opacity=".75">
          <path d="M470 330 L430 375 L452 368 L470 382 L490 366 L512 378Z" />
          <path d="M1180 340 L1140 380 L1162 372 L1182 388 L1200 372 L1226 384Z" />
        </g>
      </Layer>
      <Layer progress={p} depth={100}>
        <path d="M0 640 C 220 560, 400 600, 600 620 S 1060 540, 1440 610 L1440 900 L0 900Z" fill="#0F5E63" />
      </Layer>
      <Layer progress={p} depth={170}>
        <path d="M0 720 C 280 680, 560 720, 820 700 S 1240 680, 1440 710 L1440 900 L0 900Z" fill="#0B7A75" />
      </Layer>
      <Layer progress={p} depth={230}>
        <path d="M0 800 C 300 780, 640 810, 960 790 S 1320 780, 1440 795 L1440 900 L0 900Z" fill="#0A4F4C" />
        <motion.g
          fill="#0E1B2C"
          style={{ transformOrigin: "1290px 800px" }}
          animate={{ rotate: [-0.8, 0.8, -0.8] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          {pine(1230, 650, 2)}
          {pine(1330, 690, 1.5)}
          {pine(1395, 720, 1.1)}
        </motion.g>
      </Layer>
    </>
  );
}

// Fixed so the skyline doesn't reshuffle on every render.
const TOWERS = [
  [40, 120, 300],
  [180, 90, 380],
  [290, 140, 260],
  [450, 70, 420],
  [540, 120, 330],
  [700, 100, 280],
  [820, 80, 460],
  [920, 130, 300],
  [1080, 90, 370],
  [1190, 110, 250],
  [1320, 100, 340],
];

function City({ p }: { p: MotionValue<number> }) {
  return (
    <>
      <Layer progress={p} depth={50}>
        <path d="M0 600 h60 v-90 h50 v60 h70 v-130 h40 v100 h90 v-60 h80 v120 h120 v-150 h60 v110 h110 v-70 h90 v140 h130 v-100 h70 v60 h140 v-120 h80 v80 h150 L1440 900 L0 900Z" fill="#163049" />
      </Layer>
      <Layer progress={p} depth={120}>
        {TOWERS.map(([x, w, h], i) => (
          <g key={x}>
            <rect x={x} y={880 - h} width={w} height={h} fill="#0F2438" />
            {Array.from({ length: Math.floor(h / 46) }, (_, r) =>
              [0, 1, 2].map((c) =>
                (r * 3 + c + i) % 4 === 0 ? (
                  <motion.rect
                    key={`${r}-${c}`}
                    x={x + 14 + c * ((w - 28) / 3)}
                    y={880 - h + 20 + r * 46}
                    width={12}
                    height={16}
                    fill="#F2C46D"
                    animate={{ opacity: [0.9, 0.35, 0.9] }}
                    transition={{ duration: 3 + ((r + c + i) % 4), repeat: Infinity, delay: (r + i) % 3 }}
                  />
                ) : null
              )
            )}
          </g>
        ))}
      </Layer>
      <Layer progress={p} depth={200}>
        <rect y="860" width="1440" height="60" fill="#0A1724" />
      </Layer>
    </>
  );
}

const SCENES: Record<Scene, (props: { p: MotionValue<number> }) => React.ReactNode> = { coast: Coast, desert: Desert, hills: Hills, city: City };

export function Hero({ request, isSample, onPlan, onExplore }: { request: TripRequest; isSample: boolean; onPlan: () => void; onExplore: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -140]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const sunY = useTransform(scrollYProgress, [0, 1], [0, 260]);
  const n = daysBetween(request.start, request.end);
  const km = request.from && hasCoords(request.fromCoords) && hasCoords(request.destCoords) ? distanceKm(request.fromCoords, request.destCoords) : null;
  const scene = sceneFor(request);
  const Scenery = SCENES[scene];

  return (
    <section ref={ref} id="top" className="relative isolate flex min-h-[92svh] items-end overflow-hidden bg-ink text-on-ink">
      <svg aria-hidden="true" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 -z-10 size-full">
        <rect width="1440" height="900" fill="#0E1B2C" />
        <motion.g style={{ y: sunY }}>
          <circle cx="1040" cy="320" r="230" fill="#E8562A" opacity=".12" />
          <motion.circle cx="1040" cy="320" r="150" fill="#E8562A" initial={{ cy: 520, opacity: 0 }} animate={{ cy: 320, opacity: 1 }} transition={{ duration: 1.6, ease }} />
        </motion.g>
        {/* Keyed so a new destination fades its landscape in instead of snapping. */}
        <motion.g key={scene} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
          <Scenery p={scrollYProgress} />
        </motion.g>
      </svg>

      <motion.div style={{ y: copyY, opacity: copyOpacity }} className="gutter mx-auto flex w-full max-w-[1240px] flex-col gap-6 pt-32 pb-16 md:pb-24">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
          className="m-0 max-w-[14ch] text-[clamp(44px,7.5vw,100px)] leading-[0.98] font-extrabold"
        >
          Plan the whole trip, day by day
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.7 }} className="m-0 max-w-[52ch] text-lg text-on-ink-muted md:text-xl">
          Tell it where, when and how much. You get a day-by-day route with places to eat and see, what it costs, real photos, and how crowded it&apos;ll be on your dates.
        </motion.p>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45, duration: 0.6 }} className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onPlan}
            className="inline-flex min-h-14 items-center gap-2.5 rounded-full bg-accent px-7 text-base font-bold text-on-accent transition-transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Sparkles size={18} /> Plan your trip
          </button>
          <button type="button" onClick={onExplore} className="inline-flex min-h-14 items-center gap-2 rounded-full px-5 font-semibold text-on-ink hover:bg-white/10">
            {isSample ? "Look at an example" : "See your plan"} <ArrowDown size={18} />
          </button>
        </motion.div>

        <motion.button
          type="button"
          onClick={onPlan}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-4 flex max-w-full flex-wrap items-center gap-x-5 gap-y-2 self-start rounded-2xl border border-white/15 bg-[#0E1B2C]/75 px-5 py-3 text-left text-sm backdrop-blur-md hover:bg-[#0E1B2C]/90"
          aria-label="Edit trip details"
        >
          <span className="w-full text-xs font-semibold text-ink-accent">{isSample ? "Example trip" : "Your trip"}</span>
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
    </section>
  );
}
