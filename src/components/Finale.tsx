"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, Copy, Download, Link2, Share2, Sparkles } from "lucide-react";
import type { Trip, TripRequest } from "@/lib/schema";
import { addDays, fmt, parseISO } from "@/lib/dates";
import { money, num } from "@/lib/format";
import { Reveal } from "./Reveal";

function toMarkdown(req: TripRequest, trip: Trip) {
  const lines = [
    `# ${req.dest}: ${fmt(parseISO(req.start), { month: "short", day: "numeric" })} – ${fmt(parseISO(req.end), { month: "short", day: "numeric", year: "numeric" })}`,
    "",
    trip.summary,
    "",
  ];
  const t = trip.travel?.options?.[trip.travel.chosen];
  if (req.from && t) lines.push(`Getting there: ${t.title} — ${money(num(t.cost), req.currency)} round trip`, "");
  trip.days.forEach((d, i) => {
    lines.push(`## Day ${i + 1} · ${fmt(addDays(parseISO(req.start), i), { weekday: "short", month: "short", day: "numeric" })} — ${d.title}`);
    d.stops.forEach((s) => lines.push(`- ${s.time}  ${s.name} — ${s.note}${num(s.cost) ? ` (${money(num(s.cost), req.currency)})` : ""}`));
    if (d.tip) lines.push(`\nTip: ${d.tip}`);
    lines.push("");
  });
  return lines.join("\n");
}

export function Finale({ request, trip, tripId, onPlan }: { request: TripRequest; trip: Trip; tripId: string | null; onPlan: () => void }) {
  const [copied, setCopied] = useState<"text" | "link" | null>(null);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare("share" in navigator), []);
  const text = () => toMarkdown(request, trip);
  /** The trip's own page, once it's saved: anyone who opens it sees this exact plan. */
  const link = () => (tripId ? `${location.origin}/?trip=${tripId}` : undefined);

  const download = () => {
    const url = URL.createObjectURL(new Blob([text()], { type: "text/markdown" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${request.dest.replace(/[^\w]+/g, "-").toLowerCase()}-roadmap.md` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const copy = async (what: "text" | "link") => {
    try {
      await navigator.clipboard.writeText(what === "link" ? link()! : text());
      setCopied(what);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard blocked: download still works */
    }
  };
  const share = async () => {
    try {
      const url = link();
      await navigator.share(url ? { title: `${request.dest} roadmap`, url } : { title: `${request.dest} roadmap`, text: text() });
    } catch {
      /* dismissed */
    }
  };

  const btn = "inline-flex min-h-12 items-center gap-2 rounded-full px-5 font-bold";
  return (
    <div className="gutter mx-auto max-w-[1240px] pt-10 pb-24">
      <Reveal className="relative flex flex-wrap items-center justify-between gap-8 overflow-hidden rounded-[32px] bg-accent p-[clamp(28px,6vw,72px)] text-on-accent">
        <motion.div aria-hidden="true" className="absolute -right-24 -bottom-24 size-80 rounded-full border-[40px] border-white/10" animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }} />
        <div className="relative flex max-w-[620px] flex-col gap-3">
          <h2 className="m-0 text-[clamp(32px,5vw,58px)] leading-none font-extrabold">Your road is drawn. Pack light.</h2>
          <p className="m-0 text-[17px] opacity-90">Take it offline, send it to your travel crew, or plan the next one.</p>
        </div>
        <div className="relative flex flex-wrap gap-2.5">
          <button type="button" onClick={download} className={`${btn} bg-on-accent text-accent`}>
            <Download size={18} /> Download
          </button>
          {tripId && (
            <button type="button" onClick={() => copy("link")} className={`${btn} bg-on-accent/15 text-on-accent ring-2 ring-on-accent/70`}>
              {copied === "link" ? <Check size={18} /> : <Link2 size={18} />} {copied === "link" ? "Link copied" : "Copy link"}
            </button>
          )}
          <button type="button" onClick={() => copy("text")} className={`${btn} bg-on-accent/15 text-on-accent ring-2 ring-on-accent/70`}>
            {copied === "text" ? <Check size={18} /> : <Copy size={18} />} {copied === "text" ? "Copied" : "Copy"}
          </button>
          {canShare && (
            <button type="button" onClick={share} className={`${btn} bg-on-accent/15 text-on-accent ring-2 ring-on-accent/70`}>
              <Share2 size={18} /> Share
            </button>
          )}
          <button type="button" onClick={onPlan} className={`${btn} bg-ink text-on-ink`}>
            <Sparkles size={18} /> Plan another
          </button>
        </div>
      </Reveal>
    </div>
  );
}
