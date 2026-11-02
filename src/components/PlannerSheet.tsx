"use client";

import { useEffect, useMemo, useState } from "react";
import { Drawer } from "vaul";
import { AnimatePresence, motion } from "motion/react";
import { DayPicker, type DateRange } from "react-day-picker";
import { ArrowLeft, ArrowRight, ArrowUpDown, Bus, Car, Check, Clock, Coins, MapPin, Minus, Navigation, Plane, Plus, Sparkles, TrainFront, X, type LucideIcon } from "lucide-react";
import clsx from "clsx";
import { CURRENCIES, INTERESTS, MAX_DAYS, PACES, PRIORITY_LABELS, TRAVEL_MODES, type TravelMode, type TripRequest } from "@/lib/schema";
import { MODE_LABEL, modeWarning } from "@/lib/travel";
import { daysBetween, fmt, isoToLocal, localToISO, parseISO } from "@/lib/dates";
import { money } from "@/lib/format";
import { useIsDesktop } from "@/lib/hooks";
import { distanceKm, formatKm, hasCoords, journeyHint } from "@/lib/geo";
import { PlaceInput } from "./PlaceInput";

const POPULAR = [
  { label: "Goa, India", lat: 15.3005, lon: 74.0855 },
  { label: "Bali, Indonesia", lat: -8.4095, lon: 115.1889 },
  { label: "Lisbon, Portugal", lat: 38.7223, lon: -9.1393 },
  { label: "Kyoto, Japan", lat: 35.0116, lon: 135.7681 },
  { label: "Santorini, Greece", lat: 36.3932, lon: 25.4615 },
  { label: "Ladakh, India", lat: 34.1526, lon: 77.5771 },
  { label: "Phuket, Thailand", lat: 7.8804, lon: 98.3923 },
  { label: "Marrakech, Morocco", lat: 31.6295, lon: -7.9811 },
];
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
                {["Where are you headed?", "When are you going?", "What's the budget?", "What's your vibe?"][step]}
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
                {step === 0 && <WhereStep draft={draft} update={(patch) => setDraft((d) => ({ ...d, ...patch }))} onEnter={() => go(1)} />}
                {step === 1 && <WhenStep draft={draft} onChange={(s, e) => setDraft((d) => ({ ...d, start: s, end: e }))} />}
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
      {draft.from ? `${draft.from.split(",")[0]} → ` : ""}
      {draft.dest ? draft.dest.split(",")[0] : "No destination"} · {nDays > 0 ? `${nDays} day${nDays > 1 ? "s" : ""}` : "no dates"}
    </span>
  );
}

function WhereStep({ draft, update, onEnter }: { draft: TripRequest; update: (patch: Partial<TripRequest>) => void; onEnter: () => void }) {
  const swap = () => update({ from: draft.dest, fromCoords: draft.destCoords ?? null, dest: draft.from, destCoords: draft.fromCoords ?? null });
  return (
    <>
      <div className="relative flex flex-col gap-3">
        <PlaceInput
          id="from"
          label="From"
          icon={Navigation}
          placeholder="Your home city (optional)"
          value={draft.from}
          onChange={(from, fromCoords) => update({ from, fromCoords })}
        />
        <div className="relative z-10 -my-1 flex justify-end pr-3">
          <motion.button
            type="button"
            aria-label="Swap from and to"
            onClick={swap}
            whileTap={{ rotate: 180, scale: 0.9 }}
            className="grid size-10 place-items-center rounded-full border border-line bg-surface text-muted hover:text-fg"
          >
            <ArrowUpDown size={17} />
          </motion.button>
        </div>
        <PlaceInput
          id="dest"
          label="To"
          icon={MapPin}
          autoFocus
          placeholder="City, island or region"
          value={draft.dest}
          onChange={(dest, destCoords) => update({ dest, destCoords })}
          onEnter={onEnter}
        />
      </div>

      <JourneyCard draft={draft} />

      <TravelModePicker draft={draft} update={update} />

      <div className="flex flex-col gap-3">
        <span className="eyebrow text-muted">Popular right now</span>
        <div className="flex flex-wrap gap-2">
          {POPULAR.map((p, i) => (
            <motion.button
              key={p.label}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i }}
              whileTap={{ scale: 0.95 }}
              onClick={() => update({ dest: p.label, destCoords: { lat: p.lat, lon: p.lon } })}
              className={clsx(
                "min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors",
                draft.dest === p.label ? "border-accent bg-accent text-on-accent" : "border-line bg-bg hover:border-muted"
              )}
            >
              {p.label}
            </motion.button>
          ))}
        </div>
      </div>
    </>
  );
}

const MODE_ICON: Record<TravelMode, LucideIcon> = { flight: Plane, train: TrainFront, bus: Bus, drive: Car };

/**
 * How to get there: "Best option" (default) lets Claude choose; any mix of modes restricts it.
 * The time-vs-money slider decides what "best" means whenever more than one mode is in play.
 */
function TravelModePicker({ draft, update }: { draft: TripRequest; update: (patch: Partial<TripRequest>) => void }) {
  const km = draft.from && hasCoords(draft.fromCoords) && hasCoords(draft.destCoords) ? distanceKm(draft.fromCoords!, draft.destCoords!) : null;
  const modes = draft.modes ?? [];
  const best = modes.length === 0;
  const toggle = (m: TravelMode) => {
    const next = modes.includes(m) ? modes.filter((x) => x !== m) : [...modes, m];
    // Picking every mode is the same as letting the planner choose.
    update({ modes: next.length === TRAVEL_MODES.length ? [] : next });
  };
  const priority = draft.priority ?? 2;
  const chip = "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors";

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="eyebrow mb-3 text-muted">How do you want to travel? Pick one or more</legend>
      <div className="flex flex-wrap gap-2">
        <motion.button
          type="button"
          aria-pressed={best}
          whileTap={{ scale: 0.95 }}
          onClick={() => update({ modes: [] })}
          className={clsx(chip, best ? "border-accent bg-accent text-on-accent" : "border-line bg-bg hover:border-muted")}
        >
          <Sparkles size={16} aria-hidden="true" /> Best option
        </motion.button>
        {TRAVEL_MODES.map((m) => {
          const Icon = MODE_ICON[m];
          const on = modes.includes(m);
          const warn = modeWarning(m, km);
          return (
            <motion.button
              key={m}
              type="button"
              aria-pressed={on}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggle(m)}
              title={warn ?? undefined}
              className={clsx(
                chip,
                on ? "border-accent bg-accent text-on-accent" : warn ? "border-dashed border-line bg-bg text-muted hover:border-muted" : "border-line bg-bg hover:border-muted"
              )}
            >
              <Icon size={16} aria-hidden="true" /> {MODE_LABEL[m]}
              {warn && <span className={clsx("text-xs font-medium", on ? "text-on-accent/80" : "text-muted")}>· {warn}</span>}
            </motion.button>
          );
        })}
      </div>
      <p className="m-0 -mt-1 text-sm text-muted">
        {best
          ? "We'll compare flights, trains, buses and driving, and pick what fits you best."
          : modes.length === 1
            ? `Only ${MODE_LABEL[modes[0]].toLowerCase()} options will be planned.`
            : `We'll compare ${modes.map((m) => MODE_LABEL[m].toLowerCase()).join(" and ")} and pick what fits you best.`}
      </p>

      <AnimatePresence initial={false}>
        {modes.length !== 1 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="flex flex-col gap-2 rounded-2xl bg-surface-2 px-5 py-4">
              <label htmlFor="priority" className="text-sm font-semibold">
                What matters more to you?
              </label>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                  <Clock size={15} aria-hidden="true" /> Time
                </span>
                <input
                  id="priority"
                  type="range"
                  min={0}
                  max={4}
                  step={1}
                  value={priority}
                  onChange={(e) => update({ priority: Number(e.target.value) })}
                  aria-valuetext={PRIORITY_LABELS[priority]}
                  className="budget flex-1"
                  style={{ ["--fill" as string]: `${(priority / 4) * 100}%` }}
                />
                <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                  <Coins size={15} aria-hidden="true" /> Money
                </span>
              </div>
              <motion.span key={priority} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="text-center text-sm font-bold">
                {PRIORITY_LABELS[priority]}
              </motion.span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </fieldset>
  );
}

function JourneyCard({ draft }: { draft: TripRequest }) {
  const ok = hasCoords(draft.fromCoords) && hasCoords(draft.destCoords) && draft.from && draft.dest;
  const km = ok ? distanceKm(draft.fromCoords!, draft.destCoords!) : 0;
  const short = (s: string) => s.split(",")[0];
  return (
    <AnimatePresence initial={false}>
      {ok && (
        <motion.div
          key={`${draft.from}>${draft.dest}`}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
          aria-live="polite"
        >
          <div className="flex flex-col gap-3 rounded-2xl bg-ink p-5 text-on-ink">
            <div className="flex items-center gap-3 text-sm font-bold">
              <span className="truncate">{short(draft.from)}</span>
              <svg viewBox="0 0 200 24" className="h-6 min-w-0 flex-1" fill="none" aria-hidden="true">
                <path d="M4 18 Q 100 -6 196 18" stroke="var(--ink-2)" strokeWidth="2.5" strokeDasharray="2 7" strokeLinecap="round" />
                <motion.path d="M4 18 Q 100 -6 196 18" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} />
                <circle cx="4" cy="18" r="4" fill="var(--ink-accent)" />
                <circle cx="196" cy="18" r="4" fill="var(--accent)" />
              </svg>
              <span className="truncate text-right">{short(draft.dest)}</span>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <strong className="font-display text-3xl font-extrabold tabular-nums">{formatKm(km)}</strong>
              <span className="text-sm text-on-ink-muted">{journeyHint(km)}</span>
            </div>
            <span className="text-xs text-on-ink-muted">Straight-line distance. Your roadmap will include the best way to get there.</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function WhenStep({ draft, onChange }: { draft: TripRequest; onChange: (s: string, e: string) => void }) {
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
          {draft.from ? "Total budget, including travel" : "Total budget"}
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
