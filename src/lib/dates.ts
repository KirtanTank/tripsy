// Trip dates are plain calendar days, so everything runs in UTC to avoid timezone drift.

export const parseISO = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
};
export const toISO = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 864e5);
export const daysBetween = (a: string, b: string) => Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 864e5) + 1;
export const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString("en-US", { timeZone: "UTC", ...o });

/** Local calendar date (from a date picker) → ISO day string. */
export const localToISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** ISO day string → local Date at midnight (for the date picker). */
export const isoToLocal = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** The crowd calendar covers a week either side of the trip. */
export const calendarDates = (start: string, end: string) => {
  const out: string[] = [];
  const last = addDays(parseISO(end), 7);
  for (let d = addDays(parseISO(start), -7); d <= last; d = addDays(d, 1)) out.push(toISO(d));
  return out;
};
