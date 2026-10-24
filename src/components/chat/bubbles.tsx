import type { ReactNode } from "react";

export function WhereAvatar() {
  return (
    <span
      aria-hidden
      className="mb-0.5 inline-flex size-[26px] shrink-0 items-center justify-center rounded-full bg-coral font-sans text-[10px] font-bold text-white lg:hidden"
    >
      W
    </span>
  );
}

export function UserBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex animate-pop justify-end">
      <div className="max-w-[86%] rounded-[20px] rounded-br-[6px] bg-ink px-[15px] py-3 text-[14.5px] leading-[1.45] text-cream">
        {children}
      </div>
    </div>
  );
}

export function WhereBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex animate-pop items-end gap-2.5">
      <WhereAvatar />
      <div className="max-w-[86%] rounded-[20px] rounded-bl-[6px] border border-line bg-cream-2 px-[15px] py-3 text-[14.5px] leading-[1.45] text-ink">
        {children}
      </div>
    </div>
  );
}

export function TypingBubble() {
  return (
    <div className="flex animate-pop items-end gap-2.5" aria-label="WHERE réfléchit">
      <WhereAvatar />
      <div className="inline-flex gap-1 rounded-[20px] rounded-bl-[6px] border border-line bg-cream-2 px-4 py-3.5">
        <i className="size-1.5 animate-blink rounded-full bg-soft" />
        <i className="size-1.5 animate-blink rounded-full bg-soft [animation-delay:.2s]" />
        <i className="size-1.5 animate-blink rounded-full bg-soft [animation-delay:.4s]" />
      </div>
    </div>
  );
}

export function Notice({ tone, children }: { tone: "info" | "warn"; children: ReactNode }) {
  const cls = tone === "warn" ? "bg-amber-2 text-[#6e4f14]" : "bg-blue-2 text-[#1f4f68]";
  return (
    <div className={`flex animate-pop items-start gap-2.5 rounded-[14px] px-3.5 py-3 text-[13.5px] leading-[1.4] ${cls}`}>
      <span aria-hidden className="shrink-0">
        {tone === "warn" ? "⚠️" : "ℹ️"}
      </span>
      <span>{children}</span>
    </div>
  );
}
