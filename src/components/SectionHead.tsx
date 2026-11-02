"use client";

/** Headlines written by the model often end in a full stop; headings read better without one. */
export const plain = (s: string) => s.trim().replace(/\.$/, "");

export function SectionHead({ kicker, title, lede, dark, aside }: { kicker?: string; title: string; lede?: string; dark?: boolean; aside?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div className="flex max-w-[760px] min-w-0 flex-col gap-3">
        {kicker && <p className={`m-0 text-[15px] font-semibold ${dark ? "text-ink-accent" : "text-teal"}`}>{kicker}</p>}
        <h2 className="m-0 text-[clamp(32px,5vw,58px)] leading-[1.02] font-extrabold">{plain(title)}</h2>
        {lede && <p className={`m-0 max-w-[62ch] text-[17px] ${dark ? "text-on-ink-muted" : "text-muted"}`}>{lede}</p>}
      </div>
      {aside}
    </div>
  );
}
