"use client";

import { animate, motion, useInView, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

/** Fades and lifts children into place the first time they scroll into view. */
export function Reveal({ children, delay = 0, y = 40, className }: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.8, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

/** Section heading with an eyebrow; the title slides up line by line. */
export function SectionHead({ eyebrow, title, lede, dark, aside }: { eyebrow: string; title: string; lede?: string; dark?: boolean; aside?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div className="flex max-w-[760px] min-w-0 flex-col gap-3">
        <Reveal y={16}>
          <p className={`eyebrow m-0 ${dark ? "text-ink-accent" : "text-teal"}`}>{eyebrow}</p>
        </Reveal>
        {/* The heading itself is observed: its clipped inner span would never count as "in view". */}
        <motion.h2
          className="m-0 overflow-hidden pb-[0.06em] text-[clamp(34px,5.5vw,66px)] leading-none font-extrabold"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-10% 0px" }}
        >
          <motion.span className="block" variants={{ hidden: { y: "105%" }, show: { y: 0, transition: { duration: 0.9, ease } } }}>
            {title}
          </motion.span>
        </motion.h2>
        {lede && (
          <Reveal delay={0.15} y={20}>
            <p className={`m-0 max-w-[62ch] text-[17px] ${dark ? "text-on-ink-muted" : "text-muted"}`}>{lede}</p>
          </Reveal>
        )}
      </div>
      {aside}
    </div>
  );
}

/** Counts up to a value when it scrolls into view. */
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
