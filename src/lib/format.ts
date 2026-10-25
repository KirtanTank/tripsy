export const money = (n: number, currency: string) => {
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${Math.round(n)}`;
  }
};

export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export const num = (v: unknown, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
export const level = (v: unknown) => clamp(Math.round(num(v, 3)), 1, 5);

export const LEVELS = ["Quiet", "Light", "Moderate", "Busy", "Packed"] as const;

export const mapsUrl = (q: string) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
export const photosUrl = (q: string) => "https://www.google.com/search?tbm=isch&q=" + encodeURIComponent(q);
export const routeUrl = (places: string[]) =>
  "https://www.google.com/maps/dir/" + places.map((p) => encodeURIComponent(p)).join("/");
