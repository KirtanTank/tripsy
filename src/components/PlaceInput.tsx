"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Building2, Globe2, Landmark, Loader2, MapPin, Plane, X, type LucideIcon } from "lucide-react";
import clsx from "clsx";
import type { Coords, Place } from "@/lib/geo";

const KIND_ICON: Record<Place["kind"], LucideIcon> = { city: Building2, region: MapPin, country: Globe2, airport: Plane, place: Landmark };
const cache = new Map<string, Place[]>();

type Props = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  icon: LucideIcon;
  autoFocus?: boolean;
  /** Called on every keystroke (coords null) and when a suggestion is picked (coords set). */
  onChange: (label: string, coords: Coords | null) => void;
  onEnter?: () => void;
};

/** Text box with a live place-suggestions dropdown (combobox pattern: arrows to move, Enter to pick, Esc to close). */
export function PlaceInput({ id, label, placeholder, value, icon: Icon, autoFocus, onChange, onEnter }: Props) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced search for what the visitor typed (not for values set by picking a suggestion).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }
    const hit = cache.get(q.toLowerCase());
    if (hit) {
      setItems(hit);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch("/api/places?q=" + encodeURIComponent(q), { signal: ctl.signal })
        .then((r) => r.json())
        .then((j: { places: Place[] }) => {
          cache.set(q.toLowerCase(), j.places ?? []);
          setItems(j.places ?? []);
          setActive(-1);
        })
        .catch(() => {})
        .finally(() => !ctl.signal.aborted && setLoading(false));
    }, 220);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [query]);

  useEffect(() => {
    const close = (e: PointerEvent) => !boxRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const pick = (p: Place) => {
    onChange(p.label, { lat: p.lat, lon: p.lon });
    setOpen(false);
    setItems([]);
    setQuery("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && items.length) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp" && items.length) {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && active >= 0 && items[active]) pick(items[active]);
      else if (open && items.length && query) pick(items[0]);
      else onEnter?.();
    } else if (e.key === "Escape" && open) {
      e.stopPropagation();
      setOpen(false);
    }
  };

  const showList = open && query.trim().length >= 2;

  return (
    <div ref={boxRef} className="relative">
      <label htmlFor={id} className="eyebrow mb-2 block text-[12px] text-muted">
        {label}
      </label>
      <div className={clsx("flex items-center gap-3 rounded-2xl border bg-bg px-4 transition-colors", showList ? "border-teal" : "border-line focus-within:border-teal")}>
        <Icon size={21} className="shrink-0 text-accent" aria-hidden="true" />
        <input
          id={id}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => {
            onChange(e.target.value, null);
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => query && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          className="min-h-14 w-full min-w-0 bg-transparent text-lg font-semibold outline-none placeholder:font-medium placeholder:text-muted/70 focus-visible:outline-none"
        />
        {loading && <Loader2 size={18} className="shrink-0 animate-spin text-muted" aria-hidden="true" />}
        {value && !loading && (
          <button
            type="button"
            aria-label={`Clear ${label.toLowerCase()}`}
            onClick={() => {
              onChange("", null);
              setQuery("");
              document.getElementById(id)?.focus();
            }}
            className="-mr-2 grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2"
          >
            <X size={17} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showList && (
          <motion.ul
            id={listId}
            role="listbox"
            aria-label={`${label} suggestions`}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute inset-x-0 top-full z-30 mt-2 max-h-[300px] origin-top overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)]"
            data-lenis-prevent
          >
            {items.length === 0 && (
              <li className="px-4 py-3 text-sm text-muted">{loading ? "Searching…" : "No matches. Keep typing, or use what you typed as is."}</li>
            )}
            {items.map((p, i) => {
              const KIcon = KIND_ICON[p.kind];
              return (
                <motion.li
                  key={p.label}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.025 }}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => pick(p)}
                  onPointerEnter={() => setActive(i)}
                  className={clsx("flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 py-2", i === active ? "bg-surface-2" : "")}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-teal" aria-hidden="true">
                    <KIcon size={17} />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <strong className="truncate text-[15px]">{p.name}</strong>
                    {p.detail && <span className="truncate text-[13px] text-muted">{p.detail}</span>}
                  </span>
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
