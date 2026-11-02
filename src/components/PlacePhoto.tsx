"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import clsx from "clsx";
import type { StopType } from "@/lib/schema";
import { Motif, TILE_BG } from "./icons";
import { photosUrl } from "@/lib/format";

export type Photo = { url: string; credit: string; link: string };
const cache = new Map<string, Promise<Photo | null>>();

function fetchPhoto(q: string) {
  if (!cache.has(q)) {
    cache.set(
      q,
      fetch("/api/photos?q=" + encodeURIComponent(q))
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => (j && j.url ? (j as Photo) : null))
        .catch(() => null)
    );
  }
  return cache.get(q)!;
}

type Props = {
  place: string;
  dest: string;
  type: StopType;
  index: number;
  className?: string;
  caption?: boolean;
  sizes?: string;
};

export function PlacePhoto({ place, dest, type, index, className, caption = true }: Props) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [photo, setPhoto] = useState<Photo | null | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let alive = true;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        fetchPhoto(`${place}, ${dest}`).then((p) => alive && setPhoto(p));
      },
      { rootMargin: "400px" }
    );
    io.observe(el);
    return () => {
      alive = false;
      io.disconnect();
    };
  }, [place, dest]);

  return (
    <a
      ref={ref}
      href={photosUrl(`${place} ${dest}`)}
      target="_blank"
      rel="noopener noreferrer"
      className={clsx("group relative block overflow-hidden rounded-2xl text-white", className)}
      style={{ background: TILE_BG[index % TILE_BG.length] }}
    >
      <Motif type={type} />
      {photo === undefined && <span className="absolute inset-0 animate-pulse bg-white/10" aria-hidden="true" />}
      {photo && (
        // Remote photos come from Wikimedia / Unsplash; a plain img keeps the app free of image-proxy config.
        <motion.img
          src={photo.url}
          alt={place}
          loading="lazy"
          ref={(el) => {
            if (el?.complete && el.naturalWidth) setLoaded(true);
          }}
          onLoad={() => setLoaded(true)}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={loaded ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      )}
      {caption && (
        <span className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-4 pt-10 pb-3">
          <strong className="text-[15px] leading-tight">{place}</strong>
          <span className="text-xs text-white/85 group-hover:underline">
            {photo ? `${photo.credit} · ` : ""}More traveler photos ↗
          </span>
        </span>
      )}
    </a>
  );
}
