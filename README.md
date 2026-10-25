# Roadtrip

Pick a destination, dates and a budget. Roadtrip builds a day-by-day roadmap with cafes, beaches and must-see spots, real photos of each place, and a crowd forecast for your dates.

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
| `src/lib/schema.ts` | The trip data shape shared by the server and the UI |
| `src/lib/prompt.ts` | The planning instructions sent to Claude |

## Deploy

Push to GitHub and import the repo on Vercel, then set `ANTHROPIC_API_KEY` in the project's environment variables. Planning can take up to a minute, and the plan route allows up to 300 seconds.

## Notes

- Prices and crowd levels are AI estimates. For live numbers, connect a foot-traffic API (for example BestTime) and a hotel price API.
- Each new trip is one Claude API call on your key.
