"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ReactLenis, useLenis } from "lenis/react";
import { X } from "lucide-react";
import type { PlanEvent, Trip, TripRequest } from "@/lib/schema";
import { daysBetween } from "@/lib/dates";
import { SAMPLE_REQUEST, SAMPLE_TRIP } from "@/lib/sample";
import { storage, useReducedMotion } from "@/lib/hooks";
import { Nav } from "./Nav";
import { Hero } from "./Hero";
import { Glance } from "./Glance";
import { Crowd } from "./Crowd";
import { Roadmap } from "./Roadmap";
import { Gallery } from "./Gallery";
import { Finale } from "./Finale";
import { PlannerSheet } from "./PlannerSheet";
import { Generating, type Progress } from "./Generating";

type Saved = { request: TripRequest; trip: Trip };

export function TripApp() {
  const reduced = useReducedMotion();
  return (
    <ReactLenis root options={{ lerp: reduced ? 1 : 0.1, smoothWheel: !reduced }}>
      <Planner />
    </ReactLenis>
  );
}

function Planner() {
  const lenis = useLenis();
  const [request, setRequest] = useState<TripRequest>(SAMPLE_REQUEST);
  const [trip, setTrip] = useState<Trip>(SAMPLE_TRIP);
  const [isSample, setIsSample] = useState(true);
  const [draft, setDraft] = useState<TripRequest>(SAMPLE_REQUEST);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState("");
  const [tripKey, setTripKey] = useState(0);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    const saved = storage.load<Saved>();
    if (saved?.request && Array.isArray(saved.trip?.days) && saved.trip.days.length) {
      setRequest(saved.request);
      setDraft(saved.request);
      setTrip(saved.trip);
      setIsSample(false);
    }
  }, []);

  // Pause smooth scrolling while overlays are open so the sheet and calendar scroll normally.
  useEffect(() => {
    if (!lenis) return;
    if (sheetOpen || progress) lenis.stop();
    else lenis.start();
  }, [lenis, sheetOpen, progress]);

  const scrollTo = useCallback(
    (id: string) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (lenis) lenis.scrollTo(el, { offset: -64, duration: 1.4 });
      else el.scrollIntoView({ behavior: "smooth" });
    },
    [lenis]
  );

  const openPlanner = () => {
    setError("");
    setSheetOpen(true);
  };

  const generate = async (req: TripRequest) => {
    setDraft(req);
    setSheetOpen(false);
    setError("");
    const total = daysBetween(req.start, req.end);
    setProgress({ stage: "thinking", days: 0, total, dest: req.dest });
    const ctl = new AbortController();
    abort.current = ctl;
    try {
      const res = await fetch("/api/plan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(req), signal: ctl.signal });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || "The planner couldn't start. Try again in a moment.");
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buf = "";
      let result: Trip | null = null;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += value;
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const ev = JSON.parse(line) as PlanEvent;
          if (ev.type === "progress") setProgress({ stage: ev.stage, days: ev.days, total, dest: req.dest });
          else if (ev.type === "error") throw new Error(ev.message);
          else if (ev.type === "done") result = ev.trip;
        }
      }
      if (!result) throw new Error("The plan came back incomplete. Try again.");
      setRequest(req);
      setTrip(result);
      setIsSample(false);
      setTripKey((k) => k + 1);
      storage.save({ request: req, trip: result } satisfies Saved);
      setProgress(null);
      requestAnimationFrame(() => setTimeout(() => scrollTo("glance"), 150));
    } catch (e) {
      setProgress(null);
      if ((e as Error).name !== "AbortError") setError((e as Error).message || "Something went wrong while planning.");
    } finally {
      abort.current = null;
    }
  };

  const applyDates = (start: string, end: string) => {
    setDraft({ ...request, start, end });
    setSheetOpen(true);
  };

  return (
    <>
      <Nav onPlan={openPlanner} />
      <main className="overflow-x-clip">
        <Hero request={request} isSample={isSample} onPlan={openPlanner} onExplore={() => scrollTo("glance")} />
        <div key={tripKey}>
          <Glance request={request} trip={trip} isSample={isSample} />
          <Crowd request={request} trip={trip} onUseDates={applyDates} />
          <Roadmap request={request} days={trip.days} />
          <Gallery dest={request.dest} items={trip.gallery.length ? trip.gallery : trip.days.flatMap((d) => d.stops.filter((s) => s.type !== "move" && s.type !== "stay").map((s) => ({ place: s.name, type: s.type })))} />
          <Finale request={request} trip={trip} onPlan={openPlanner} />
        </div>
      </main>
      <footer className="gutter border-t border-line py-7 text-center text-[13px] text-muted">
        Itineraries, prices and crowd levels are AI estimates. Check opening hours and prices before you go. Photos via Wikimedia Commons.
      </footer>

      <PlannerSheet open={sheetOpen} onOpenChange={setSheetOpen} initial={draft} onSubmit={generate} />
      <Generating progress={progress} onStop={() => abort.current?.abort()} />
      <Toast message={error} onClose={() => setError("")} />
    </>
  );
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          role="alert"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          className="fixed inset-x-4 bottom-[calc(16px+env(safe-area-inset-bottom))] z-[110] mx-auto flex max-w-[520px] items-start gap-3 rounded-2xl bg-warn-bg p-4 text-sm font-semibold text-warn-fg shadow-xl"
        >
          <span className="flex-1">{message}</span>
          <button type="button" onClick={onClose} aria-label="Dismiss" className="-m-2 grid size-10 place-items-center rounded-full">
            <X size={18} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
