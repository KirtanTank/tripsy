/**
 * Finds one good photo of a place. Uses Unsplash when UNSPLASH_ACCESS_KEY is set,
 * otherwise Wikipedia / Wikimedia Commons, which needs no key. Found photos are cached for 7 days.
 */
import { cached } from "@/lib/cache";

export const runtime = "nodejs";

type Photo = { url: string; credit: string; link: string };
const UA = "Tripsy/0.1 (travel itinerary demo)";
const DAY = 60 * 60 * 24;

async function fromUnsplash(q: string, key: string): Promise<Photo | null> {
  const url = `https://api.unsplash.com/search/photos?per_page=1&orientation=landscape&query=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Authorization: `Client-ID ${key}` }, cache: "no-store" });
  if (!res.ok) return null;
  const j = await res.json();
  const p = j?.results?.[0];
  if (!p) return null;
  return {
    url: p.urls.regular,
    credit: `Photo by ${p.user?.name ?? "Unsplash"} on Unsplash`,
    link: `${p.links?.html}?utm_source=tripsy&utm_medium=referral`,
  };
}

async function fromWikipedia(q: string): Promise<Photo | null> {
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&generator=search&gsrlimit=4&prop=pageimages|info&inprop=url&piprop=thumbnail&pithumbsize=1200&gsrsearch=" +
    encodeURIComponent(q);
  const res = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
  if (!res.ok) return null;
  const j = await res.json();
  const pages: { index: number; thumbnail?: { source: string }; fullurl: string }[] = j?.query?.pages ?? [];
  const best = pages.sort((a, b) => a.index - b.index).find((p) => p.thumbnail?.source);
  return best ? { url: best.thumbnail!.source, credit: "Wikimedia Commons", link: best.fullurl } : null;
}

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 160);
  if (!q) return Response.json({ error: "Missing q" }, { status: 400 });
  try {
    const key = process.env.UNSPLASH_ACCESS_KEY;
    // Try the full "place, destination" query first, then the place name alone.
    const place = q.split(",")[0].trim();
    const { value: photo } = await cached(
      "photos",
      [q.toLowerCase(), !!key],
      DAY * 7,
      async () => (key && (await fromUnsplash(q, key))) || (await fromWikipedia(q)) || (place !== q ? await fromWikipedia(place) : null),
      // Not finding a photo may be a hiccup, so only real photos are kept.
      { keep: (p) => p !== null }
    );
    return Response.json(photo ?? { url: null }, { headers: { "cache-control": `public, s-maxage=${DAY}, stale-while-revalidate=${DAY * 7}` } });
  } catch {
    return Response.json({ url: null });
  }
}
