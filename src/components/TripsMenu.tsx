"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FolderClock, Loader2, Trash2 } from "lucide-react";
import clsx from "clsx";
import { fmt, parseISO } from "@/lib/dates";
import type { TripSummary } from "@/lib/db";

const range = (t: TripSummary) => `${fmt(parseISO(t.start), { month: "short", day: "numeric" })} – ${fmt(parseISO(t.end), { month: "short", day: "numeric", year: "numeric" })}`;

/** The visitor's saved trips, from the database. Loaded each time it opens, so it's never stale. */
export function TripsMenu({ currentId, onOpen, onDeleted }: { currentId: string | null; onOpen: (id: string) => void; onDeleted: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [trips, setTrips] = useState<TripSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setFailed(false);
    fetch("/api/trips")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => setTrips(j.trips))
      .catch(() => setFailed(true));
    const close = (e: PointerEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const remove = async (id: string) => {
    setTrips((ts) => ts?.filter((t) => t.id !== id) ?? null);
    const res = await fetch(`/api/trips/${id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) onDeleted(id);
  };

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-on-ink-muted hover:bg-white/10 hover:text-on-ink"
      >
        <FolderClock size={18} /> <span className="hidden sm:inline">My trips</span>
        <span className="sr-only sm:hidden">My trips</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-x-4 top-[calc(68px+env(safe-area-inset-top))] max-h-[min(70vh,520px)] overflow-y-auto rounded-2xl bg-ink-2 p-2 text-on-ink shadow-2xl ring-1 ring-white/12 sm:absolute sm:inset-x-auto sm:top-[calc(100%+8px)] sm:right-0 sm:w-[340px]"
          >
            <p className="px-3 pt-2 pb-1 text-xs font-bold tracking-wide text-on-ink-muted uppercase">Saved trips</p>
            {failed ? (
              <p className="px-3 py-4 text-sm text-on-ink-muted">Couldn&apos;t load your trips. Try again in a moment.</p>
            ) : !trips ? (
              <p className="flex items-center gap-2 px-3 py-4 text-sm text-on-ink-muted">
                <Loader2 size={16} className="animate-spin" /> Loading…
              </p>
            ) : !trips.length ? (
              <p className="px-3 py-4 text-sm text-on-ink-muted">Trips you plan are saved here, and each one gets a link you can share.</p>
            ) : (
              <ul className="m-0 list-none p-0">
                {trips.map((t) => (
                  <li key={t.id} className={clsx("group flex items-center gap-1 rounded-xl", t.id === currentId && "bg-white/8")}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        onOpen(t.id);
                      }}
                      className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-left hover:bg-white/8"
                    >
                      <span className="block truncate text-[15px] font-bold">{t.dest.split(",")[0]}</span>
                      <span className="block truncate text-xs text-on-ink-muted">
                        {range(t)}
                        {t.headline ? ` · ${t.headline}` : ""}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(t.id)}
                      aria-label={`Delete the ${t.dest.split(",")[0]} trip`}
                      className="grid size-10 shrink-0 place-items-center rounded-full text-on-ink-muted hover:bg-white/10 hover:text-on-ink"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
