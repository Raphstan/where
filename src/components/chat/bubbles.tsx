import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Mascot } from "@/components/shell/wordmark";
import type { NoticeTone } from "./messages";

export function WhereAvatar() {
  return (
    <span
      aria-hidden
      className="mb-0.5 inline-flex size-[28px] shrink-0 items-center justify-center rounded-full bg-paper-2 shadow-soft lg:hidden"
    >
      <Mascot className="h-[17px] w-[15px]" />
    </span>
  );
}

export function UserBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex animate-pop justify-end">
      <div className="max-w-[86%] rounded-[20px] rounded-ee-[6px] bg-ink px-[15px] py-3 text-[14.5px] leading-[1.45] wrap-anywhere text-paper">
        {children}
      </div>
    </div>
  );
}

export function WhereBubble({ children }: { children: ReactNode }) {
  return (
    <div className="flex animate-pop items-end gap-2.5">
      <WhereAvatar />
      <div className="max-w-[86%] rounded-[20px] rounded-es-[6px] bg-paper-2 shadow-soft px-[15px] py-3 text-[14.5px] leading-[1.45] text-ink">
        {children}
      </div>
    </div>
  );
}

export function TypingBubble() {
  const t = useTranslations("chat");
  return (
    <div className="flex animate-pop items-end gap-2.5" aria-label={t("typing")}>
      <WhereAvatar />
      <div className="inline-flex gap-1 rounded-[20px] rounded-es-[6px] bg-paper-2 shadow-soft px-4 py-3.5">
        <i className="size-1.5 animate-blink rounded-full bg-soft" />
        <i className="size-1.5 animate-blink rounded-full bg-soft [animation-delay:.2s]" />
        <i className="size-1.5 animate-blink rounded-full bg-soft [animation-delay:.4s]" />
      </div>
    </div>
  );
}

const NOTICE_TONE: Record<NoticeTone, string> = {
  warn: "bg-amber-2 text-[#6e4f14]",
  info: "bg-blue-2 text-[#2c3a8c]",
  orange: "bg-orange-2 text-[#8a2e0e]",
  soft: "bg-lilac-2 text-ink-2",
};

/** Notice de la conversation (maquette .notice : warn, info, orange, soft). */
export function Notice({ tone, children }: { tone: NoticeTone; children: ReactNode }) {
  return (
    <div className={`animate-pop rounded-[14px] px-3.5 py-3 text-[13.5px] leading-[1.4] ${NOTICE_TONE[tone]}`}>
      {children}
    </div>
  );
}
