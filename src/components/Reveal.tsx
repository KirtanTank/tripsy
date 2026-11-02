"use client";

import { animate, motion, useInView, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

/** Headlines written by the model often end in a full stop; headings read better without one. */
export const plain = (s: string) => s.trim().replace(/\.$/, "");

export function SectionHead({ kicker, title, lede, dark, aside }: { kicker?: string; title: string; lede?: string; dark?: boolean; aside?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div className="flex max-w-[760px] min-w-0 flex-col gap-3">
        {kicker && <p className={`m-0 text-[15px] font-semibold ${dark ? "text-ink-accent" : "text-teal"}`}>{kicker}</p>}
        <h2 className="m-0 text-[clamp(32px,5vw,58px)] leading-[1.02] font-extrabold">{plain(title)}</h2>
        {lede && <p className={`m-0 max-w-[62ch] text-[17px] ${dark ? "text-on-ink-muted" : "text-muted"}`}>{lede}</p>}
      </div>
      {aside}
    </div>
  );
}

export function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => format(v));
  useEffect(() => {
    if (!inView) return;
    const c = animate(mv, value, { duration: 1.4, ease });
    return () => c.stop();
  }, [inView, value, mv]);
  return <motion.span ref={ref}>{text}</motion.span>;
}
