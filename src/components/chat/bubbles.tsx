import type { ReactNode } from "react";
import type { NoticeTone } from "./messages";

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

const NOTICE_TONE: Record<NoticeTone, { cls: string; icon: string }> = {
  warn: { cls: "bg-amber-2 text-[#6e4f14]", icon: "⚠️" },
  info: { cls: "bg-blue-2 text-[#1f4f68]", icon: "ℹ️" },
  coral: { cls: "bg-coral-2 text-[#8a3a28]", icon: "✦" },
  soft: { cls: "bg-sand-2 text-ink-2", icon: "🔒" },
};

/** Notice de la conversation (maquette .notice : warn, info, coral, soft). */
export function Notice({ tone, icon, children }: { tone: NoticeTone; icon?: string; children: ReactNode }) {
  const t = NOTICE_TONE[tone];
  return (
    <div className={`flex animate-pop items-start gap-2.5 rounded-[14px] px-3.5 py-3 text-[13.5px] leading-[1.4] ${t.cls}`}>
      <span aria-hidden className="shrink-0">
        {icon ?? t.icon}
      </span>
      <span>{children}</span>
    </div>
  );
}
