import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tripsy — travel roadmaps",
    short_name: "Tripsy",
    description: "Day-by-day travel roadmaps with cafes, beaches, photos and crowd forecasts.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0e1b2c",
    theme_color: "#0e1b2c",
    categories: ["travel", "lifestyle"],
    icons: [
      { src: "/app-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
