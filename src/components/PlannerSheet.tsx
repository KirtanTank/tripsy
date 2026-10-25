"use client";

import { useEffect, useMemo, useState } from "react";
import { Drawer } from "vaul";
import { AnimatePresence, motion } from "motion/react";
import { DayPicker, type DateRange } from "react-day-picker";
import { ArrowLeft, ArrowRight, Check, MapPin, Minus, Plus, Sparkles, X } from "lucide-react";
import clsx from "clsx";
import { CURRENCIES, INTERESTS, MAX_DAYS, PACES, type TripRequest } from "@/lib/schema";
import { daysBetween, fmt, isoToLocal, localToISO, parseISO } from "@/lib/dates";
import { money } from "@/lib/format";
import { useIsDesktop } from "@/lib/hooks";

const POPULAR = ["Goa, India", "Bali, Indonesia", "Lisbon, Portugal", "Kyoto, Japan", "Santorini, Greece", "Ladakh, India", "Phuket, Thailand", "Marrakech, Morocco"];
const STEPS = ["Where", "When", "Budget", "Vibe"] as const;
/** Slider ceiling per currency, roughly a comfortable two-week trip for a small group. */
const BUDGET_MAX: Record<string, number> = { INR: 500000, USD: 8000, EUR: 7000, GBP: 6000, AED: 30000, THB: 250000, JPY: 1000000, AUD: 12000, SGD: 10000 };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: TripRequest;
  onSubmit: (req: TripRequest) => void;
};

export function PlannerSheet({ open, onOpenChange, initial, onSubmit }: Props) {
  const desktop = useIsDesktop();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [draft, setDraft] = useState<TripRequest>(initial);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setDraft(initial);
      setStep(0);
      setError("");
    }
  }, [open, initial]);

  const set = <K extends keyof TripRequest>(k: K, v: TripRequest[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const nDays = draft.start && draft.end ? daysBetween(draft.start, draft.end) : 0;

  const problem = (s: number): string => {
    if (s === 0 && !draft.dest.trim()) return "Add a destination, like a city, island or region.";
    if (s === 1) {
      if (!draft.start || !draft.end) return "Pick a start and an end date.";
      if (nDays > MAX_DAYS) return `Trips can be up to ${MAX_DAYS} days for now.`;
    }
    if (s === 2 && !(draft.budget > 0)) return "Enter a total budget for the trip.";
    return "";
  };

  const go = (delta: number) => {
    if (delta > 0) {
      const p = problem(step);
      if (p) return setError(p);
    }
    setError("");
    setDir(delta);
    if (step + delta >= STEPS.length) {
      onSubmit({ ...draft, dest: draft.dest.trim() });
      return;
    }
    setStep((s) => Math.max(0, s + delta));
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} direction={desktop ? "right" : "bottom"} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-[2px]" />
        <Drawer.Content
          aria-describedby={undefined}
          className={clsx(
            "fixed z-[90] flex flex-col bg-surface text-fg outline-none",
            desktop
              ? "top-3 right-3 bottom-3 w-[min(560px,calc(100vw-24px))] rounded-[28px]"
              : "inset-x-0 bottom-0 max-h-[94svh] rounded-t-[28px] pb-[env(safe-area-inset-bottom)]"
          )}
        >
          {!desktop && <Drawer.Handle className="!mt-3 !h-1.5 !w-12 !bg-line" />}
          <header className="flex items-center justify-between gap-4 px-6 pt-5 pb-3">
            <div className="flex flex-col gap-1">
              <span className="eyebrow text-teal">
                Step {step + 1} of {STEPS.length}
              </span>
              <Drawer.Title className="font-display text-[28px] leading-none font-extrabold">
                {["Where to?", "When are you going?", "What's the budget?", "What's your vibe?"][step]}
              </Drawer.Title>
            </div>
            <Drawer.Close aria-label="Close planner" className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 hover:bg-line">
              <X size={20} />
            </Drawer.Close>
          </header>

          <div className="flex gap-1.5 px-6 pb-4" aria-hidden="true">
            {STEPS.map((s, i) => (
              <div key={s} className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                <motion.div className="h-full bg-accent" initial={false} animate={{ width: i <= step ? "100%" : "0%" }} transition={{ duration: 0.4 }} />
              </div>
            ))}
          </div>

          <div className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-6 pb-4" data-lenis-prevent>
            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.div
                key={step}
                custom={dir}
                variants={{
                  enter: (d: number) => ({ x: d * 40, opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit: (d: number) => ({ x: d * -40, opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col gap-5"
              >
                {step === 0 && <WhereStep value={draft.dest} onChange={(v) => set("dest", v)} onEnter={() => go(1)} />}
                {step === 1 && <WhenStep draft={draft} desktop={desktop} onChange={(s, e) => setDraft((d) => ({ ...d, start: s, end: e }))} />}
                {step === 2 && <BudgetStep draft={draft} set={set} nDays={nDays} />}
                {step === 3 && <VibeStep draft={draft} set={set} />}
              </motion.div>
            </AnimatePresence>
          </div>

          <footer className="flex flex-col gap-3 border-t border-line px-6 pt-4 pb-5">
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  role="alert"
                  className="rounded-xl bg-warn-bg px-4 py-2.5 text-sm font-semibold text-warn-fg"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
            <div className="flex items-center gap-3">
              {step > 0 && (
                <button type="button" onClick={() => go(-1)} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-surface-2 px-5 font-semibold hover:bg-line">
                  <ArrowLeft size={18} /> Back
                </button>
              )}
              <TripSummary draft={draft} nDays={nDays} />
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => go(1)}
                className="ml-auto inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-6 font-bold text-on-accent"
              >
                {step === STEPS.length - 1 ? (
                  <>
                    <Sparkles size={18} /> Build my roadmap
                  </>
                ) : (
                  <>
                    Next <ArrowRight size={18} />
                  </>
                )}
              </motion.button>
            </div>
          </footer>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function TripSummary({ draft, nDays }: { draft: TripRequest; nDays: number }) {
  return (
    <span className="hidden min-w-0 truncate text-sm text-muted sm:block">
      {draft.dest || "No destination"} · {nDays > 0 ? `${nDays} day${nDays > 1 ? "s" : ""}` : "no dates"}
    </span>
  );
}

function WhereStep({ value, onChange, onEnter }: { value: string; onChange: (v: string) => void; onEnter: () => void }) {
  return (
    <>
      <label htmlFor="dest" className="sr-only">
        Destination
      </label>
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-bg px-4 focus-within:border-teal">
        <MapPin size={22} className="shrink-0 text-accent" aria-hidden="true" />
        <input
          id="dest"
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onEnter()}
          placeholder="City, island or region"
          autoComplete="off"
          className="min-h-16 w-full bg-transparent text-xl font-semibold outline-none focus-visible:outline-none placeholder:text-muted/70"
        />
      </div>
      <div className="flex flex-col gap-3">
        <span className="eyebrow text-muted">Popular right now</span>
        <div className="flex flex-wrap gap-2">
          {POPULAR.map((p, i) => (
            <motion.button
              key={p}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onChange(p)}
              className={clsx(
                "min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors",
                value === p ? "border-accent bg-accent text-on-accent" : "border-line bg-bg hover:border-muted"
              )}
            >
              {p}
            </motion.button>
          ))}
        </div>
      </div>
    </>
  );
}

function WhenStep({ draft, desktop, onChange }: { draft: TripRequest; desktop: boolean; onChange: (s: string, e: string) => void }) {
  const range: DateRange | undefined = draft.start ? { from: isoToLocal(draft.start), to: draft.end ? isoToLocal(draft.end) : undefined } : undefined;
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const n = draft.start && draft.end ? daysBetween(draft.start, draft.end) : 0;
  return (
    <>
      <div className="flex justify-center">
        <DayPicker
          mode="range"
          selected={range}
          onSelect={(r) => onChange(r?.from ? localToISO(r.from) : "", r?.to ? localToISO(r.to) : r?.from ? localToISO(r.from) : "")}
          defaultMonth={range?.from ?? today}
          disabled={{ before: today }}
          numberOfMonths={1}
          pagedNavigation
          weekStartsOn={1}
          max={MAX_DAYS - 1}
        />
      </div>
      <div className="rounded-2xl bg-surface-2 px-5 py-4" aria-live="polite">
        {n > 0 ? (
          <p className="m-0">
            <strong className="font-display text-2xl">
              {n} day{n > 1 ? "s" : ""}
            </strong>
            <span className="block text-sm text-muted">
              {fmt(parseISO(draft.start), { weekday: "short", month: "short", day: "numeric" })} to {fmt(parseISO(draft.end), { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
            </span>
          </p>
        ) : (
          <p className="m-0 text-muted">Tap your first day, then your last day.</p>
        )}
      </div>
      <p className="m-0 text-sm text-muted">We use your dates to forecast how crowded it will be, so pick the real ones.</p>
    </>
  );
}

function BudgetStep({ draft, set, nDays }: { draft: TripRequest; set: <K extends keyof TripRequest>(k: K, v: TripRequest[K]) => void; nDays: number }) {
  const max = BUDGET_MAX[draft.currency] ?? 10000;
  const step = max / 200;
  const fill = Math.min(100, (draft.budget / max) * 100);
  const perPersonDay = nDays > 0 ? draft.budget / draft.travelers / nDays : 0;
  return (
    <>
      <div className="flex flex-col gap-2">
        <label htmlFor="budget" className="eyebrow text-muted">
          Total budget, excluding flights
        </label>
        <div className="flex gap-2">
          <select
            aria-label="Currency"
            value={draft.currency}
            onChange={(e) => set("currency", e.target.value as TripRequest["currency"])}
            className="min-h-16 rounded-2xl border border-line bg-bg px-3 text-lg font-semibold"
          >
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <input
            id="budget"
            type="number"
            inputMode="numeric"
            min={1}
            value={draft.budget || ""}
            onChange={(e) => set("budget", Number(e.target.value))}
            className="min-h-16 w-full min-w-0 rounded-2xl border border-line bg-bg px-4 font-display text-3xl font-extrabold tabular-nums outline-none focus:border-teal"
          />
        </div>
      </div>
      <input
        type="range"
        aria-label="Budget slider"
        className="budget w-full"
        min={step}
        max={max}
        step={step}
        value={Math.min(draft.budget, max)}
        onChange={(e) => set("budget", Number(e.target.value))}
        style={{ ["--fill" as string]: `${fill}%` }}
      />
      <div className="flex flex-col gap-2">
        <span className="eyebrow text-muted" id="trav-lbl">
          Travelers
        </span>
        <div className="flex items-center gap-4" role="group" aria-labelledby="trav-lbl">
          <button type="button" aria-label="Fewer travelers" onClick={() => set("travelers", Math.max(1, draft.travelers - 1))} className="grid size-12 place-items-center rounded-full bg-surface-2 hover:bg-line">
            <Minus size={18} />
          </button>
          <motion.span key={draft.travelers} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-10 text-center font-display text-3xl font-extrabold tabular-nums">
            {draft.travelers}
          </motion.span>
          <button type="button" aria-label="More travelers" onClick={() => set("travelers", Math.min(20, draft.travelers + 1))} className="grid size-12 place-items-center rounded-full bg-surface-2 hover:bg-line">
            <Plus size={18} />
          </button>
        </div>
      </div>
      {perPersonDay > 0 && (
        <div className="rounded-2xl bg-surface-2 px-5 py-4">
          <strong className="font-display text-2xl tabular-nums">{money(perPersonDay, draft.currency)}</strong>
          <span className="block text-sm text-muted">per person, per day</span>
        </div>
      )}
    </>
  );
}

function VibeStep({ draft, set }: { draft: TripRequest; set: <K extends keyof TripRequest>(k: K, v: TripRequest[K]) => void }) {
  const toggle = (x: string) => set("interests", draft.interests.includes(x) ? draft.interests.filter((i) => i !== x) : [...draft.interests, x]);
  return (
    <>
      <fieldset className="flex flex-col gap-3">
        <legend className="eyebrow mb-3 text-muted">I&apos;m into</legend>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((x) => {
            const on = draft.interests.includes(x);
            return (
              <motion.button
                key={x}
                type="button"
                aria-pressed={on}
                whileTap={{ scale: 0.94 }}
                onClick={() => toggle(x)}
                className={clsx(
                  "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors",
                  on ? "border-accent bg-accent text-on-accent" : "border-line bg-bg hover:border-muted"
                )}
              >
                {on && <Check size={15} />} {x}
              </motion.button>
            );
          })}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-3">
        <legend className="eyebrow mb-3 text-muted">Pace</legend>
        <div className="relative grid grid-cols-3 rounded-full bg-surface-2 p-1">
          {PACES.map((p) => (
            <button key={p} type="button" aria-pressed={draft.pace === p} onClick={() => set("pace", p)} className="relative z-10 min-h-11 rounded-full text-sm font-bold">
              {draft.pace === p && <motion.span layoutId="pace-pill" className="absolute inset-0 -z-10 rounded-full bg-surface shadow" transition={{ type: "spring", bounce: 0.25, duration: 0.45 }} />}
              {p}
            </button>
          ))}
        </div>
        <p className="m-0 text-sm text-muted">
          {draft.pace === "Relaxed" ? "3–4 stops a day, long lunches." : draft.pace === "Packed" ? "5–6 stops a day, see it all." : "4–5 stops a day with breathing room."}
        </p>
      </fieldset>
    </>
  );
}
