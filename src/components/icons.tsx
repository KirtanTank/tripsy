import { BedDouble, Coffee, Landmark, Moon, Mountain, Route, Umbrella, Utensils, type LucideIcon } from "lucide-react";
import type { StopType } from "@/lib/schema";

export const STOP_META: Record<StopType, { icon: LucideIcon; label: string; tint: string }> = {
  cafe: { icon: Coffee, label: "Cafe", tint: "#F2C48F" },
  beach: { icon: Umbrella, label: "Beach", tint: "#9FD3C7" },
  sight: { icon: Landmark, label: "Must visit", tint: "#D8D3F2" },
  food: { icon: Utensils, label: "Food", tint: "#F6C9C0" },
  nature: { icon: Mountain, label: "Nature", tint: "#BFE0B2" },
  night: { icon: Moon, label: "Night out", tint: "#C9D2F0" },
  move: { icon: Route, label: "Getting around", tint: "#DAD7CF" },
  stay: { icon: BedDouble, label: "Stay", tint: "#DAD7CF" },
};

export const isPlace = (t: StopType) => t !== "move" && t !== "stay";

const MOTIFS: Record<string, React.ReactNode> = {
  beach: (
    <>
      <circle cx="82" cy="28" r="12" fill="#fff" fillOpacity=".5" />
      <path d="M8 56q10-6 20 0t20 0 20 0 20 0 20 0 20 0M8 66q10-6 20 0t20 0 20 0 20 0 20 0 20 0" />
    </>
  ),
  sight: <path d="M20 64V38h8v-6h6v6h10v-6h6v6h10v-6h6v6h8v26M44 64V52a6 6 0 0 1 12 0v12M6 64h108" />,
  cafe: <path d="M60 72c2-16 4-28 10-40M70 32c-10-4-20 0-24 6M70 32c10-6 20-4 26 2M70 32c-2-8-8-12-14-12M70 32c6-8 14-10 20-10M8 72h104" />,
  nature: <path d="M10 20c20-10 30 10 40-2h20c10 12 25-8 40 2M54 20v44M60 20v46M66 20v44M20 70q20-8 40 0t40 0" />,
};
export const TILE_BG = ["#0B6E80", "#B5562E", "#2F6B4F", "#7A4B2A", "#127A7F", "#9E3410", "#3E6E8C", "#C8762A", "#1A8A6E", "#6E5BA8"];

/** Illustrated stand-in shown while a photo loads or when none is found. */
export function Motif({ type }: { type: StopType }) {
  const key = type === "beach" ? "beach" : type === "nature" ? "nature" : type === "cafe" || type === "food" ? "cafe" : "sight";
  return (
    <svg viewBox="0 0 120 80" preserveAspectRatio="xMidYMid slice" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" opacity=".7" aria-hidden="true" className="absolute inset-0 size-full">
      {MOTIFS[key]}
    </svg>
  );
}
