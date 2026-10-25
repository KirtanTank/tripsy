"use client";

import { useEffect, useState } from "react";

export function useMediaQuery(query: string, initial = false) {
  const [matches, setMatches] = useState(initial);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}

export const useIsDesktop = () => useMediaQuery("(min-width: 768px)");
export const useReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");

const STORE_KEY = "roadtrip:last";
export const storage = {
  load<T>(): T | null {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  save(value: unknown) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(value));
    } catch {
      /* storage blocked: the trip just won't be remembered */
    }
  },
};
