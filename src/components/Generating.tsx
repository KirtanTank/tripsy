"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plane } from "lucide-react";

const WAIT = ["Reading up on your destination…", "Checking the season and holidays…", "Matching cafes and beaches to your interests…", "Fitting it into your budget…"];

export type Progress = { stage: "thinking" | "crowds" | "days" | "gallery" | "places"; days: number; total: number; dest: string };

export function Generating({ progress, onStop }: { progress: Progress | null; onStop: () => void }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!progress) return;
    const t = setInterval(() => setTick((n) => n + 1), 3500);
    return () => clearInterval(t);
  }, [progress]);

  const pct = !progress
    ? 0
    : progress.stage === "places"
      ? 99
      : progress.stage === "gallery"
      ? 96
      : progress.stage === "days"
        ? 20 + (progress.days / Math.max(1, progress.total)) * 74
        : progress.stage === "crowds"
          ? 14
          : Math.min(12, 4 + tick * 2);
  const message = !progress
    ? ""
    : progress.stage === "places"
      ? "Pinning every stop on the map…"
      : progress.stage === "gallery"
      ? "Picking photo spots…"
      : progress.stage === "days"
        ? `Planning day ${Math.min(progress.days, progress.total)} of ${progress.total}…`
        : progress.stage === "crowds"
          ? "Forecasting crowds…"
          : WAIT[tick % WAIT.length];

  return (
    <AnimatePresence>
      {progress && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-10 bg-ink/95 px-6 text-on-ink backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="status"
          aria-live="polite"
        >
          <div className="relative h-40 w-full max-w-[560px]">
            <svg viewBox="0 0 560 160" className="absolute inset-0 size-full" fill="none" aria-hidden="true">
              <path d="M20 130 C 140 20, 260 150, 380 60 S 520 40, 540 30" stroke="var(--ink-2)" strokeWidth="4" strokeDasharray="2 12" strokeLinecap="round" />
              <motion.path
                d="M20 130 C 140 20, 260 150, 380 60 S 520 40, 540 30"
                stroke="var(--accent)"
                strokeWidth="4"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: pct / 100 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
              <circle cx="20" cy="130" r="7" fill="var(--ink-accent)" />
              <circle cx="540" cy="30" r="7" fill="var(--accent)" />
            </svg>
            <motion.div
              className="absolute top-0 left-0"
              style={{ offsetPath: `path("M20 130 C 140 20, 260 150, 380 60 S 520 40, 540 30")`, offsetRotate: "auto 45deg" } as React.CSSProperties}
              initial={{ offsetDistance: "0%" }}
              animate={{ offsetDistance: `${pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <span className="-mt-4 -ml-4 grid size-8 place-items-center rounded-full bg-on-ink text-ink">
                <Plane size={16} />
              </span>
            </motion.div>
          </div>
          <div className="flex max-w-[460px] flex-col items-center gap-3 text-center">
            <p className="m-0 font-semibold text-ink-accent">Planning your trip to</p>
            <h2 className="m-0 text-[clamp(30px,5vw,46px)] leading-none font-extrabold">{progress.dest}</h2>
            <AnimatePresence mode="wait">
              <motion.p key={message} className="m-0 text-lg text-on-ink-muted" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                {message}
              </motion.p>
            </AnimatePresence>
            <p className="m-0 text-sm text-on-ink-muted/80">This usually takes under a minute.</p>
          </div>
          <button type="button" onClick={onStop} className="min-h-11 rounded-full border border-white/20 px-6 font-semibold hover:bg-white/10">
            Stop
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
