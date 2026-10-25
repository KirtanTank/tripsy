import { ImageResponse } from "next/og";

/** The app icon: the route mark on ink, drawn at any size. */
export function appIcon(size: number) {
  const stroke = Math.max(2, size / 14);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0E1B2C" }}>
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="#F0784C" strokeWidth={(stroke / size) * 24 * 1.6} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="18" r="2.5" />
          <circle cx="18" cy="6" r="2.5" />
          <path d="M8.5 18H14a3.5 3.5 0 0 0 0-7h-4a3.5 3.5 0 0 1 0-7h5.5" />
        </svg>
      </div>
    ),
    { width: size, height: size }
  );
}
