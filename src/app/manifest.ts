import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Roadtrip — travel roadmaps",
    short_name: "Roadtrip",
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
