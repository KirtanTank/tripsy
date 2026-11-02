"use client";

import { motion, useMotionValueEvent, useScroll, useSpring } from "motion/react";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { TripsMenu } from "./TripsMenu";
import clsx from "clsx";
import { useLenis } from "lenis/react";

export function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <path d="M8.5 18H14a3.5 3.5 0 0 0 0-7h-4a3.5 3.5 0 0 1 0-7h5.5" />
    </svg>
  );
}

type NavProps = { onPlan: () => void; currentId: string | null; onOpenTrip: (id: string) => void; onDeleted: (id: string) => void };

export function Nav({ onPlan, currentId, onOpenTrip, onDeleted }: NavProps) {
  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30 });
  const [solid, setSolid] = useState(false);
  const lenis = useLenis();
  useMotionValueEvent(scrollY, "change", (y) => setSolid(y > 40));

  const jump = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -64 });
    else el.scrollIntoView();
  };

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-[70] h-[env(safe-area-inset-top)] bg-ink" aria-hidden="true" />
      <header
        className={clsx(
          "fixed inset-x-0 top-[env(safe-area-inset-top)] z-[60] text-on-ink transition-colors duration-300",
          solid ? "bg-ink/90 backdrop-blur-md" : "bg-transparent"
        )}
      >
        <motion.div className="absolute inset-x-0 bottom-0 h-[3px] origin-left bg-accent" style={{ scaleX: progress }} aria-hidden="true" />
        <div className="gutter mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-4">
          <a href="#top" onClick={jump("top")} className="flex items-center gap-2.5 font-display text-[21px] font-extrabold">
            <Logo /> Tripsy
          </a>
          <nav aria-label="Sections" className="hidden items-center gap-6 text-sm font-medium text-on-ink-muted md:flex">
            {[
              ["rush", "Rush"],
              ["crowd", "Crowds"],
              ["roadmap", "Roadmap"],
              ["gallery", "Gallery"],
            ].map(([id, label]) => (
              <a key={id} href={`#${id}`} onClick={jump(id)} className="hover:text-on-ink">
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
          <TripsMenu currentId={currentId} onOpen={onOpenTrip} onDeleted={onDeleted} />
          <motion.button
            type="button"
            onClick={onPlan}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-on-ink px-4 text-sm font-bold text-ink"
          >
            <Sparkles size={16} /> Plan a trip
          </motion.button>
          </div>
        </div>
      </header>
    </>
  );
}
