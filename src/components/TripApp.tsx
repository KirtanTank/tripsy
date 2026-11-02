"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ReactLenis, useLenis } from "lenis/react";
import { RefreshCw, X } from "lucide-react";
import type { PlanEvent, Trip, TripRequest } from "@/lib/schema";
import { daysBetween } from "@/lib/dates";
import { SAMPLE_REQUEST, SAMPLE_TRIP } from "@/lib/sample";
import { storage, useReducedMotion } from "@/lib/hooks";
import { Nav } from "./Nav";
import { Hero } from "./Hero";
import { Glance } from "./Glance";
import { Crowd } from "./Crowd";
import { Rush } from "./Rush";
import { Roadmap } from "./Roadmap";
import { Gallery } from "./Gallery";
import { Finale } from "./Finale";
import { PlannerSheet } from "./PlannerSheet";
import { Generating, type Progress } from "./Generating";

/** id is the trip's row in the database, once it's been saved there. */
type Saved = { request: TripRequest; trip: Trip; id?: string };

const isTrip = (s: Partial<Saved> | null | undefined): s is Saved => !!s?.request && Array.isArray(s.trip?.days) && s.trip.days.length > 0;

async function fetchTrip(id: string): Promise<Saved> {
  const res = await fetch(`/api/trips/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error("That trip link doesn't work any more.");
  const t = await res.json();
  return { id: t.id, request: t.request, trip: t.trip };
}

/** Puts the trip's share id in the address bar, so the page URL is the trip's link. */
function setUrlTrip(id: string | null) {
  const url = new URL(location.href);
  if (id) url.searchParams.set("trip", id);
  else url.searchParams.delete("trip");
  history.replaceState(history.state, "", url);
}

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
  /** When the last plan was reused from an identical earlier request, so the visitor can ask for a fresh one. */
  const [reused, setReused] = useState<{ at: string; req: TripRequest } | null>(null);
  const [tripKey, setTripKey] = useState(0);
  const [tripId, setTripId] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  const show = useCallback((saved: Saved) => {
    // Trips saved by older versions lack From, travel modes and the travel options.
    const req = { ...saved.request, from: saved.request.from ?? "", modes: saved.request.modes ?? [], priority: saved.request.priority ?? 2 };
    saved.trip.travel ??= null;
    setRequest(req);
    setDraft(req);
    setTrip(saved.trip);
    setIsSample(false);
    setTripId(saved.id ?? null);
    setUrlTrip(saved.id ?? null);
    storage.save({ ...saved, request: req } satisfies Saved);
    // Remount the trip sections so their local state (like the time-vs-money slider) starts from the saved trip.
    setTripKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const linked = new URLSearchParams(location.search).get("trip");
    const local = storage.load<Saved>();
    if (linked && linked !== local?.id) {
      fetchTrip(linked)
        .then(show)
        .catch((e) => {
          setError((e as Error).message);
          setUrlTrip(null);
          if (isTrip(local)) show(local);
        });
    } else if (isTrip(local)) {
      show(local);
    } else {
      // This browser's storage was cleared: bring back the newest trip saved on the server for this visitor.
      fetch("/api/trips")
        .then((r) => r.json())
        .then(({ trips }) => (trips?.[0] ? fetchTrip(trips[0].id).then(show) : undefined))
        .catch(() => {});
    }
  }, [show]);

  /** Saves the trip to the database in the background; it's already in this browser either way. */
  const persist = async (saved: Saved) => {
    try {
      const res = await fetch("/api/trips", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(saved) });
      if (!res.ok) return;
      const { id } = await res.json();
      setTripId(id);
      setUrlTrip(id);
      storage.save({ ...saved, id } satisfies Saved);
    } catch {
      /* offline or the database is down: the trip stays saved in this browser */
    }
  };

  const openTrip = async (id: string) => {
    try {
      show(await fetchTrip(id));
      requestAnimationFrame(() => setTimeout(() => scrollTo("glance"), 150));
    } catch (e) {
      setError((e as Error).message);
    }
  };

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

  const generate = async (req: TripRequest, fresh = false) => {
    // One plan at a time: a second press while one is being built would pay for the same plan twice.
    if (abort.current) return;
    setDraft(req);
    setSheetOpen(false);
    setError("");
    setReused(null);
    const total = daysBetween(req.start, req.end);
    setProgress({ stage: "thinking", days: 0, total, dest: req.dest });
    const ctl = new AbortController();
    abort.current = ctl;
    try {
      const res = await fetch(`/api/plan${fresh ? "?fresh=1" : ""}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(req), signal: ctl.signal });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || "The planner couldn't start. Try again in a moment.");
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buf = "";
      let result: Trip | null = null;
      let cachedAt: string | undefined;
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
          else if (ev.type === "done") {
            result = ev.trip;
            cachedAt = ev.cachedAt;
          }
        }
      }
      if (!result) throw new Error("The plan came back incomplete. Try again.");
      show({ request: req, trip: result });
      void persist({ request: req, trip: result });
      setProgress(null);
      if (cachedAt) setReused({ at: cachedAt, req });
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
      <Nav onPlan={openPlanner} currentId={tripId} onOpenTrip={openTrip} onDeleted={(id) => {
          if (id !== tripId) return;
          setTripId(null);
          setUrlTrip(null);
        }} />
      <main className="overflow-x-clip">
        <Hero request={request} isSample={isSample} onPlan={openPlanner} onExplore={() => scrollTo("glance")} />
        <div key={tripKey}>
          <Glance request={request} trip={trip} isSample={isSample} onReplan={(mode) => generate({ ...request, modes: [mode] })} />
          <Rush request={request} trip={trip} />
          <Crowd request={request} trip={trip} onUseDates={applyDates} />
          <Roadmap request={request} days={trip.days} />
          <Gallery dest={request.dest} items={trip.gallery.length ? trip.gallery : trip.days.flatMap((d) => d.stops.filter((s) => s.type !== "move" && s.type !== "stay").map((s) => ({ place: s.name, type: s.type })))} />
          <Finale request={request} trip={trip} tripId={tripId} onPlan={openPlanner} />
        </div>
      </main>
      <footer className="gutter border-t border-line py-7 text-center text-[13px] text-muted">
        Itineraries, prices and crowd levels are AI estimates. Check opening hours and prices before you go. Photos via Wikimedia Commons. Rush signals from TomTom, OpenSky Network and Wikipedia pageviews.
      </footer>

      <PlannerSheet open={sheetOpen} onOpenChange={setSheetOpen} initial={draft} onSubmit={generate} />
      <Generating progress={progress} onStop={() => abort.current?.abort()} />
      <Toast message={error} onClose={() => setError("")} />
      <Toast
        tone="info"
        message={reused ? `Same trip as one planned ${ago(reused.at)}, so this plan was reused at no cost.` : ""}
        action={reused ? { label: "Plan fresh", icon: <RefreshCw size={16} />, onClick: () => generate(reused.req, true) } : undefined}
        onClose={() => setReused(null)}
      />
    </>
  );
}

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
}

type ToastAction = { label: string; icon: React.ReactNode; onClick: () => void };

function Toast({ message, onClose, tone = "warn", action }: { message: string; onClose: () => void; tone?: "warn" | "info"; action?: ToastAction }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          role={tone === "warn" ? "alert" : "status"}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          className="fixed inset-x-4 bottom-[calc(16px+env(safe-area-inset-bottom))] z-[110] mx-auto flex max-w-[520px] items-start gap-3 rounded-2xl bg-warn-bg p-4 text-sm font-semibold text-warn-fg shadow-xl"
          style={tone === "info" ? { background: "var(--ink-2)", color: "var(--on-ink)", boxShadow: "0 0 0 1px rgb(255 255 255 / 0.12), 0 12px 32px rgb(0 0 0 / 0.35)" } : undefined}
        >
          <span className="flex-1 self-center">{message}</span>
          {action && (
            <button type="button" onClick={action.onClick} className="-my-1 inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-on-ink px-3.5 text-ink">
              {action.icon} {action.label}
            </button>
          )}
          <button type="button" onClick={onClose} aria-label="Dismiss" className="-m-2 grid size-10 place-items-center rounded-full">
            <X size={18} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
