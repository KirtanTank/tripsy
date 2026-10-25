"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, Copy, Download, Share2, Sparkles } from "lucide-react";
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
  trip.days.forEach((d, i) => {
    lines.push(`## Day ${i + 1} · ${fmt(addDays(parseISO(req.start), i), { weekday: "short", month: "short", day: "numeric" })} — ${d.title}`);
    d.stops.forEach((s) => lines.push(`- ${s.time}  ${s.name} — ${s.note}${num(s.cost) ? ` (${money(num(s.cost), req.currency)})` : ""}`));
    if (d.tip) lines.push(`\nTip: ${d.tip}`);
    lines.push("");
  });
  return lines.join("\n");
}

export function Finale({ request, trip, onPlan }: { request: TripRequest; trip: Trip; onPlan: () => void }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare("share" in navigator), []);
  const text = () => toMarkdown(request, trip);

  const download = () => {
    const url = URL.createObjectURL(new Blob([text()], { type: "text/markdown" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${request.dest.replace(/[^\w]+/g, "-").toLowerCase()}-roadmap.md` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: download still works */
    }
  };
  const share = async () => {
    try {
      await navigator.share({ title: `${request.dest} roadmap`, text: text() });
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
          <button type="button" onClick={copy} className={`${btn} bg-on-accent/15 text-on-accent ring-2 ring-on-accent/70`}>
            {copied ? <Check size={18} /> : <Copy size={18} />} {copied ? "Copied" : "Copy"}
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
