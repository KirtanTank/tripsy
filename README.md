# Tripsy

Pick a destination, dates and a budget. Tripsy builds a day-by-day roadmap with cafes, beaches and must-see spots, real photos of each place, and a crowd forecast for your dates.

Works on phones, tablets and desktops, and can be installed to the home screen as an app.

## Run it

```bash
npm install
cp .env.example .env.local   # then add your ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000. Without an API key the example Goa trip still works; building a new trip shows a message asking for the key.

| Variable | Needed | What it does |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Claude plans the itinerary and crowd forecast |
| `UNSPLASH_ACCESS_KEY` | No | Higher-quality photos. Without it, photos come from Wikimedia Commons |
| `MAPBOX_TOKEN` | No | Live road traffic in the Rush meter: drive time on the real route now vs a typical day. Readings are reused for 30 minutes; `MAPBOX_MONTHLY_CAP` (default 50,000) stops requests before the 100,000 free tier |
| `TOMTOM_API_KEY` | No | Fallback road traffic when there's no Mapbox token. Without either, the road lane shows the crowd forecast as an estimate. Air (OpenSky) and interest (Wikipedia pageviews) need no key |
| `DATABASE_URL` | No | Postgres for saved trips (Neon, Supabase or any Postgres). Without it, an embedded Postgres keeps them in `.data/db` |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | No | Redis for the API cache. Without them, the cache uses files in `.cache/api` |

## How it's built

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS 4**
- **Motion** for the scroll-linked animation: parallax hero, title reveals, count-ups, the road line and plane that track your scroll, the sideways-scrolling gallery
- **Lenis** for smooth scrolling
- **Vaul** for the planner: a bottom sheet on phones, a side panel on desktop
- **react-day-picker** for the date range
- **Claude API** (`claude-opus-5-5`) with structured output validated by **Zod**, streamed so the loading screen shows which day is being planned

| Path | What's there |
|---|---|
| `src/components/TripApp.tsx` | Page state, calling the planner API, saving the last trip |
| `src/components/PlannerSheet.tsx` | The 4-step planner (where, when, budget, vibe) |
| `src/components/{Hero,Glance,Crowd,Roadmap,Gallery,Finale}.tsx` | The scroll sections |
| `src/app/api/plan/route.ts` | Asks Claude for the trip, streams progress back |
| `src/app/api/photos/route.ts` | Finds a photo for a place (Unsplash or Wikimedia) |
| `src/app/api/places/route.ts` | From/To search suggestions via [Photon](https://photon.komoot.io), a free OpenStreetMap geocoder (no key) |
| `src/lib/geo.ts` | Distances and rough travel times between places |
| `src/lib/schema.ts` | The trip data shape shared by the server and the UI |
| `src/lib/prompt.ts` | The planning instructions sent to Claude |

## Deploy

Push to GitHub and import the repo on Vercel, then set `ANTHROPIC_API_KEY` in the project's environment variables. Serverless disks are temporary and not shared between instances, so also set `DATABASE_URL` (a free Neon or Supabase database) and the Upstash Redis variables (Vercel's Upstash integration sets them as `KV_REST_API_URL` / `KV_REST_API_TOKEN`, which also work). Planning can take up to a minute, and the plan route allows up to 300 seconds.

## Notes

- Prices and crowd levels are AI estimates. For live numbers, connect a foot-traffic API (for example BestTime) and a hotel price API.
- Each new trip is one Claude API call on your key.

## Caching

Every outside API goes through one cache (`src/lib/cache.ts`), so a repeat of a recent question costs nothing:

| What | Reused for | Notes |
|---|---|---|
| Claude trip plans | 7 days | Same trip details, ignoring capitals, spaces and the order of interests. The app says when a plan was reused and offers **Plan fresh** |
| Mapbox / TomTom road traffic | 30 minutes | The Rush meter's refresh button can fetch again once a reading is a minute old |
| OpenSky aircraft | 1 minute | |
| Wikipedia interest | 1 hour | |
| Place search and stop pins (Photon) | 30 days | Places don't move |
| Photos | 7 days | |

Answers live in memory and in `.cache/api/` (gitignored), so they survive a restart. Identical requests that arrive together share one call. Failed calls aren't stored, and an older good answer is served instead. Delete `.cache/` to clear everything, or set `CACHE_DIR` to move it. With the Upstash variables set, the files are replaced by Redis keys named `tripsy:*`, kept a week past their TTL so a stale answer can stand in when an API fails.

## Saved trips

Every planned trip is saved to Postgres (`src/lib/db.ts`) and gets a share link, `/?trip=<id>`, that opens that exact plan for anyone. Trips belong to an anonymous id in an httpOnly cookie, so there are no accounts yet: **My trips** in the nav lists the visitor's own trips, and only they can delete them. If the browser's storage is cleared, the page brings back their newest trip from the database.

The table is created on first use. Locally there's nothing to set up: without `DATABASE_URL`, PGlite (Postgres compiled to WebAssembly) stores it in `.data/db` (gitignored). Set `DATABASE_URL` and the same SQL runs on a real server instead.
