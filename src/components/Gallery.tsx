"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import type { Trip } from "@/lib/schema";
import { PlacePhoto } from "./PlacePhoto";
import { SectionHead } from "./SectionHead";
import { useReducedMotion } from "@/lib/hooks";

/**
 * Scroll-driven horizontal gallery: the section is tall, its content sticks to the
 * viewport, and vertical scroll slides the strip of photos sideways.
 */
export function Gallery({ dest, items }: { dest: string; items: Trip["gallery"] }) {
  const outer = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [distance, setDistance] = useState(0);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: outer, offset: ["start start", "end end"] });
  const smooth = useSpring(scrollYProgress, { stiffness: 110, damping: 26 });
  const x = useTransform(smooth, [0, 1], [0, -distance]);

  useLayoutEffect(() => {
    const measure = () => {
      if (!track.current) return;
      setDistance(Math.max(0, track.current.scrollWidth - window.innerWidth + 32));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (track.current) ro.observe(track.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [items]);

  const heights = ["h-[52svh]", "h-[40svh]", "h-[46svh]", "h-[38svh]"];
  const cards = items.slice(0, 12);

  if (reduced) {
    return (
      <section id="gallery" className="gutter mx-auto max-w-[1240px] scroll-mt-16 py-24">
        <SectionHead title="Photos from people who've been" />
        <div className="mt-10 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
          {cards.map((g, i) => (
            <PlacePhoto key={g.place} place={g.place} dest={dest} type={g.type} index={i} className="h-64" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section ref={outer} id="gallery" className="relative scroll-mt-16" style={{ height: `calc(100svh + ${distance}px)` }}>
      <div className="sticky top-0 flex h-svh flex-col justify-center gap-8 overflow-hidden pt-16">
        <div className="gutter mx-auto w-full max-w-[1240px]">
          <SectionHead
            title="Photos from people who've been"
            aside={<p className="m-0 max-w-[320px] text-[15px] text-muted">Scroll to move through the places on your plan. Tap one for more photos.</p>}
          />
        </div>
        <motion.div ref={track} style={{ x }} className="flex items-end gap-4 pr-8 pl-[max(16px,calc((100vw-1240px)/2+16px))]">
          {cards.map((g, i) => (
            <motion.div
              key={g.place}
              className={`w-[min(78vw,380px)] shrink-0 ${heights[i % heights.length]}`}
              initial={{ opacity: 0, y: 60, rotate: i % 2 ? 3 : -3 }}
              whileInView={{ opacity: 1, y: 0, rotate: 0 }}
              viewport={{ once: true, margin: "0px -5% 0px 0px" }}
              transition={{ type: "spring", bounce: 0.3, duration: 0.9, delay: (i % 4) * 0.06 }}
            >
              <PlacePhoto place={g.place} dest={dest} type={g.type} index={i} className="size-full rounded-3xl" />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
