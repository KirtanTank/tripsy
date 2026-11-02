"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { BookOpen, Car, Plane, RefreshCw, type LucideIcon } from "lucide-react";
import clsx from "clsx";
import type { Trip, TripRequest } from "@/lib/schema";
import { fmt, parseISO } from "@/lib/dates";
import { formatKm, hasCoords, type Coords, type Place } from "@/lib/geo";
import { formatHours } from "@/lib/travel";
import { LEVELS, level } from "@/lib/format";
import { RUSH_DAYS, RUSH_REFRESH_MIN, interestLevel, roadLevel, rushLevel, rushWindow, type RushData } from "@/lib/rush";
import { SectionHead } from "./SectionHead";

const REFRESH_MS = RUSH_REFRESH_MIN * 60 * 1000;
const VERDICT = ["Quieter than usual", "Normal traffic", "Picking up", "Getting busy", "The rush is on"];
const short = (s: string) => s.split(",")[0].trim();
const day = (iso: string) => fmt(parseISO(iso), { month: "short", day: "numeric" });

function ago(iso: string, now: number) {
  const m = Math.round((now - new Date(iso).getTime()) / 60000);
  return m < 1 ? "just now" : m === 1 ? "1 min ago" : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`;
}

/** The destination's coordinates: from the request, or looked up by name for older saved trips. */
function useDestCoords(request: TripRequest) {
  const given = hasCoords(request.destCoords) ? request.destCoords : null;
  const [found, setFound] = useState<Coords | null>(null);
  useEffect(() => {
    if (given) return;
    let live = true;
    fetch(`/api/places?q=${encodeURIComponent(request.dest)}`)
      .then((r) => r.json())
      .then((j: { places: Place[] }) => live && j.places[0] && setFound({ lat: j.places[0].lat, lon: j.places[0].lon }))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [given, request.dest]);
  return given ?? found;
}

export function Rush({ request, trip }: { request: TripRequest; trip: Trip }) {
  const ref = useRef<HTMLElement>(null);
  const seen = useInView(ref, { once: true, margin: "20% 0px" });
  const dest = useDestCoords(request);
  const [data, setData] = useState<RushData | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Auto-refresh reuses the server's 30-minute readings; the refresh button asks for fresh ones.
  const load = useCallback(async (fresh = false) => {
    if (!dest) return;
    setLoading(true);
    const q = new URLSearchParams({ dest: request.dest, start: request.start, end: request.end, lat: String(dest.lat), lon: String(dest.lon) });
    if (request.from && hasCoords(request.fromCoords)) {
      q.set("fromLat", String(request.fromCoords.lat));
      q.set("fromLon", String(request.fromCoords.lon));
    }
    if (fresh) q.set("fresh", "1");
    try {
      const res = await fetch(`/api/rush?${q}`);
      if (!res.ok) throw new Error();
      setData(await res.json());
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [dest, request.dest, request.start, request.end, request.from, request.fromCoords]);

  // Load once the section is near the screen, then keep it fresh while the tab is visible.
  useEffect(() => {
    if (!seen) return;
    load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), REFRESH_MS);
    return () => clearInterval(t);
  }, [seen, load]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const win = rushWindow(request.start);
  const from = request.from ? short(request.from) : "";
  const to = short(request.dest);
  const lv = data ? rushLevel(data) : null;
  // Without live road data, fall back to the AI crowd forecast for the first day (the calendar starts a week early).
  const forecast = level(trip.crowd.calendar[7]);

  return (
    <section ref={ref} id="rush" className="gutter mx-auto max-w-[1240px] scroll-mt-16 pt-24 md:pt-32">
      <SectionHead
        kicker="Rush meter"
        title={`How busy is ${to} getting?`}
        lede={`Checked over the ${RUSH_DAYS} days before you leave (${day(win.start)} – ${day(win.end)}): traffic on the road${from ? ` from ${from}` : ""}, planes overhead, and how many people are looking ${to} up on Wikipedia.`}
      />

      <div className="rush-grid relative mt-10 flex flex-col gap-7 overflow-hidden rounded-[24px] bg-ink p-5 text-on-ink md:p-9">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <PhaseBadge phase={data?.phase} opens={win.start} />
            <span className="font-display text-lg font-bold tabular-nums">
              {day(win.start)} → {day(win.end)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-on-ink-muted">
            <span aria-live="polite">{loading && !data ? "Fetching signals…" : data ? `Updated ${ago(data.updatedAt, now)}` : failed ? "Couldn't reach the sources" : ""}</span>
            <button type="button" onClick={() => load(true)} disabled={loading || !dest} aria-label="Refresh signals" className="grid size-10 place-items-center rounded-full ring-1 ring-on-ink/20 hover:bg-on-ink/10 disabled:opacity-50">
              <RefreshCw size={16} className={clsx(loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Wireframe route: home on the left, destination on the right, live traffic flowing between. */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-sm font-bold">
            <span>{from || "Around"}</span>
            <span className="text-ink-accent">{to}</span>
          </div>
          <div className="relative flex flex-col gap-2 py-2">
            <Node side="left" />
            <Node side="right" pulse />
            <Lane
              icon={Car}
              label="Road"
              live={data?.road.status === "live"}
              count={data?.road.status === "live" ? 8 + (roadLevel(data.road) ?? 1) * 4 : 0}
              duration={7 / Math.max(0.3, data?.road.flow ?? 1)}
            />
            <Lane icon={Plane} label="Air" live={data?.air.status === "live"} count={data?.air.status === "live" ? Math.min(8, data.air.overhead) : 0} duration={11} plane highlight={data?.air.low ?? 0} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Tile
            icon={Car}
            title="Road traffic"
            source={data?.road.provider === "tomtom" ? "TomTom" : "Mapbox"}
            href={data?.road.provider === "tomtom" ? "https://developer.tomtom.com/traffic-api" : "https://docs.mapbox.com/api/navigation/directions/"}
            estimate={data?.road.status !== "live"}
          >
            {data?.road.status === "live" ? (
              <>
                <Big>
                  {`${Math.round(data.road.delay * 100) < 0 ? "−" : "+"}${Math.abs(Math.round(data.road.delay * 100))}%`}
                </Big>
                <p className="m-0 text-sm text-on-ink-muted">
                  {data.road.provider === "mapbox"
                    ? `${formatHours(data.road.minutes! / 60)} to drive ${formatKm(data.road.km!)} right now, against ${formatHours(data.road.typicalMinutes! / 60)} normally. ${data.road.delay < -0.02 ? "Lighter than usual" : LEVELS[roadLevel(data.road)! - 1]}.`
                    : `Slower than free-flowing traffic, ${LEVELS[roadLevel(data.road)! - 1].toLowerCase()}. Sampled at ${data.road.points} points${from ? " along the way" : " in town"}.`}
                </p>
              </>
            ) : (
              <>
                <Big muted>{LEVELS[forecast - 1]}</Big>
                <p className="m-0 text-sm text-on-ink-muted">
                  {!data
                    ? "Waiting for data…"
                    : data.road.status === "no-key"
                      ? "No live traffic feed here, so this is an estimate from the crowd forecast."
                      : `${data.road.reason ?? "No live reading"}. Showing the crowd forecast instead.`}
                </p>
              </>
            )}
          </Tile>

          <Tile icon={Plane} title="In the sky nearby" source="OpenSky" href="https://opensky-network.org" estimate={data?.air.status !== "live"}>
            {data?.air.status === "live" ? (
              <>
                <Big>
                  {data.air.overhead} <span className="text-lg">aircraft</span>
                </Big>
                <p className="m-0 text-sm text-on-ink-muted">
                  Within about 150 km of {to} right now. {data.air.low ? `${data.air.low} flying low, likely landing or taking off.` : "None flying low near the airports."}
                </p>
              </>
            ) : (
              <>
                <Big muted>No signal</Big>
                <p className="m-0 text-sm text-on-ink-muted">{data ? "OpenSky is busy or rate-limited. Try refreshing in a minute." : "Waiting for data…"}</p>
              </>
            )}
          </Tile>

          <Tile
            icon={BookOpen}
            title={`Interest in ${to}`}
            source="Wikipedia"
            href={data?.interest.article ? `https://pageviews.wmcloud.org/?project=en.wikipedia.org&pages=${encodeURIComponent(data.interest.article)}` : "https://pageviews.wmcloud.org"}
            estimate={data?.interest.status !== "live"}
          >
            {data?.interest.status === "live" ? (
              <>
                <div className="flex items-end justify-between gap-3">
                  <Big>
                    {`${data.interest.ratio.toFixed(1)}×`}
                  </Big>
                  <Spark days={data.interest.days} baseline={data.interest.baseline} />
                </div>
                <p className="m-0 text-sm text-on-ink-muted">
                  {data.interest.days.at(-1)!.views.toLocaleString("en")} page views on {day(data.interest.days.at(-1)!.date)}, against a typical {data.interest.baseline.toLocaleString("en")} a day.
                  {data.interest.latest ? ` Your window opens ${day(win.start)}; these are the latest days.` : ""}
                </p>
              </>
            ) : (
              <>
                <Big muted>No signal</Big>
                <p className="m-0 text-sm text-on-ink-muted">{data ? `No Wikipedia article found for ${to}.` : "Waiting for data…"}</p>
              </>
            )}
          </Tile>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-on-ink/15 pt-5">
          <div className="flex items-center gap-3">
            <Meter level={lv} />
            <div>
              <p className="m-0 font-display text-xl font-bold">{lv ? VERDICT[lv - 1] : data ? "Not enough live signal yet" : "Reading the signals…"}</p>
              <p className="m-0 text-sm text-on-ink-muted">
                {lv && data ? verdictWhy(data) : "Road traffic and reading interest feed the verdict. Air traffic is shown for context."}
              </p>
            </div>
          </div>
          <p className="m-0 max-w-[36ch] text-xs text-on-ink-muted">These are signals, not a headcount. Nobody publishes how many people are travelling somewhere.</p>
        </div>
      </div>
    </section>
  );
}

function verdictWhy(d: RushData) {
  const parts: string[] = [];
  const r = roadLevel(d.road);
  const i = interestLevel(d.interest);
  if (r) parts.push(`roads ${LEVELS[r - 1].toLowerCase()}`);
  if (i) parts.push(`interest ${d.interest.ratio >= 1 ? `${d.interest.ratio.toFixed(1)}× usual` : "below usual"}`);
  const s = parts.join(", ");
  return s.charAt(0).toUpperCase() + s.slice(1) + ".";
}

function PhaseBadge({ phase, opens }: { phase?: RushData["phase"]; opens: string }) {
  if (phase === "preview")
    return <span className="rounded-full bg-on-ink/10 px-3 py-1 text-xs font-bold tracking-wide uppercase">Preview · live from {day(opens)}</span>;
  if (phase === "past") return <span className="rounded-full bg-on-ink/10 px-3 py-1 text-xs font-bold tracking-wide uppercase">Trip over</span>;
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-on-ink/10 px-3 py-1 text-xs font-bold tracking-wide uppercase">
      <span className="relative flex size-2.5">
        <motion.span className="absolute inset-0 rounded-full bg-ink-accent" animate={{ scale: [1, 2.4], opacity: [0.7, 0] }} transition={{ duration: 1.6, repeat: Infinity }} />
        <span className="relative size-2.5 rounded-full bg-ink-accent" />
      </span>
      Live
    </span>
  );
}

function Node({ side, pulse }: { side: "left" | "right"; pulse?: boolean }) {
  return (
    <span className={clsx("absolute top-0 bottom-0 z-10 flex items-center", side === "left" ? "-left-1" : "-right-1")} aria-hidden="true">
      <span className="relative block h-full w-0.5 rounded bg-on-ink/30">
        {pulse && <motion.span className="absolute inset-y-0 -inset-x-1 rounded bg-ink-accent/40" animate={{ opacity: [0.2, 0.8, 0.2] }} transition={{ duration: 2.4, repeat: Infinity }} />}
      </span>
    </span>
  );
}

function Lane({ icon: Icon, label, live, count, duration, plane, highlight = 0 }: { icon: LucideIcon; label: string; live: boolean; count: number; duration: number; plane?: boolean; highlight?: number }) {
  return (
    <div className="relative mx-3 h-12" role="img" aria-label={live ? `${label}: ${count} moving${plane ? " aircraft" : " dots, more means busier"}` : `${label}: no live data`}>
      <span className={clsx("absolute inset-x-0 top-1/2 border-t-2", live ? "border-on-ink/25" : "border-dashed border-on-ink/15")} />
      <span className="absolute top-1/2 left-2 z-10 flex -translate-y-1/2 items-center gap-1.5 rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold tracking-wide text-on-ink-muted uppercase ring-1 ring-on-ink/15">
        <Icon size={12} /> {label}
        {!live && <span className="font-semibold normal-case opacity-80">· estimate</span>}
      </span>
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: count }, (_, i) => {
          const x = (i + 0.5) / count;
          const style = { "--x": `${x * 100}%`, "--dur": `${duration}s`, "--delay": `${-x * duration}s` } as React.CSSProperties;
          return plane ? (
            <Plane key={i} size={16} className={clsx("lane-dot rotate-45", i < highlight ? "text-accent" : "text-ink-accent")} style={style} />
          ) : (
            <span key={i} className="lane-dot size-2 rounded-full bg-ink-accent shadow-[0_0_10px_var(--ink-accent)]" style={style} />
          );
        })}
      </div>
    </div>
  );
}

function Tile({ icon: Icon, title, source, href, estimate, children }: { icon: LucideIcon; title: string; source: string; href: string; estimate: boolean; children: React.ReactNode }) {
  return (
    <div className={clsx("flex min-w-0 flex-col gap-2 rounded-2xl border p-5 break-words", estimate ? "border-dashed border-on-ink/20" : "border-on-ink/10 bg-ink-2/60")}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-bold">
          <Icon size={16} className="text-ink-accent" /> {title}
        </span>
        <a href={href} target="_blank" rel="noreferrer" className="rounded-full bg-on-ink/10 px-2.5 py-0.5 text-[11px] font-bold text-on-ink-muted hover:text-on-ink">
          {source}
        </a>
      </div>
      {children}
    </div>
  );
}

const Big = ({ children, muted }: { children: React.ReactNode; muted?: boolean }) => (
  <p className={clsx("m-0 font-display text-[40px] leading-none font-extrabold tabular-nums", muted && "text-[28px] text-on-ink-muted")}>{children}</p>
);

function Spark({ days, baseline }: { days: { date: string; views: number }[]; baseline: number }) {
  const W = 120;
  const H = 44;
  const vs = days.map((d) => d.views);
  const max = Math.max(...vs, baseline) * 1.1;
  const min = Math.min(...vs, baseline) * 0.8;
  const y = (v: number) => H - ((v - min) / (max - min || 1)) * H;
  const x = (i: number) => (days.length > 1 ? (i / (days.length - 1)) * W : W / 2);
  const d = vs.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg width={W} height={H} viewBox={`-4 -4 ${W + 8} ${H + 8}`} aria-hidden="true" className="shrink-0 overflow-visible">
      <line x1={0} x2={W} y1={y(baseline)} y2={y(baseline)} stroke="currentColor" strokeOpacity={0.35} strokeDasharray="3 4" />
      <motion.path d={d} fill="none" stroke="var(--ink-accent)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }} />
      <motion.circle cx={x(vs.length - 1)} cy={y(vs.at(-1)!)} r={4} fill="var(--ink-accent)" animate={{ r: [4, 6, 4] }} transition={{ duration: 1.8, repeat: Infinity }} />
    </svg>
  );
}

function Meter({ level: lv }: { level: number | null }) {
  return (
    <div className="flex h-10 items-end gap-1" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((l) => (
        <motion.span
          key={l}
          className="w-2.5 rounded-sm"
          style={{ background: lv && l <= lv ? `var(--c${l})` : "rgb(255 255 255 / 0.12)" }}
          initial={{ height: 6 }}
          animate={{ height: 8 + l * 6 }}
          transition={{ delay: 0.1 * l, type: "spring", bounce: 0.5 }}
        />
      ))}
    </div>
  );
}
