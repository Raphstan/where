"use client";

import { useEffect, useRef } from "react";
import { BOOKING_TEXT, leavingText, type BookingOption } from "@/lib/booking/options";
import { PlatformLogo } from "./platform-logo";

/**
 * « Tu quittes WH3RE » (docs/prototype.html, renderLeave). Le lien sortant s'ouvre dans un nouvel
 * onglet ; au retour sur WH3RE (onglet de nouveau visible) ou sur « Revenir à WH3RE », on demande
 * « As-tu réservé ? ».
 */
export function LeavingScreen({
  option,
  placeName,
  onBack,
}: {
  option: BookingOption;
  placeName: string;
  onBack: () => void;
}) {
  const left = useRef(false);
  const back = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    back.current?.focus();
    const onVisible = () => {
      if (document.visibilityState === "visible" && left.current) onBack();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBack();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("keydown", onKey);
    };
  }, [onBack]);

  const external = option.url.startsWith("http");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaving-title"
      className="fixed inset-0 z-[60] flex animate-fade flex-col items-center justify-center gap-4 bg-night p-[30px] text-center text-paper"
    >
      <div className="font-mono text-[11px] font-medium tracking-[0.08em] text-lilac uppercase">{BOOKING_TEXT.leavingEyebrow}</div>
      <h2 id="leaving-title" className="max-w-[420px] font-display text-[21px] font-bold leading-tight">
        {leavingText(option.kind)}
      </h2>
      <div className="flex w-full max-w-[340px] flex-col gap-2.5 rounded-[16px] bg-white p-[18px] text-left text-[#111] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.55)]">
        <div className="flex items-center gap-2.5">
          <PlatformLogo kind={option.kind} />
          <b className="min-w-0 truncate">{placeName}</b>
        </div>
        <a
          href={option.url}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
          onClick={() => {
            left.current = true;
          }}
          className="inline-flex min-h-9 items-center justify-center rounded-full bg-ink px-3.5 text-[13px] font-bold text-paper transition-colors hover:bg-night"
        >
          {option.label}
        </a>
      </div>
      <button ref={back} type="button" onClick={onBack} className="text-[13.5px] font-semibold text-ink-2 hover:underline">
        {BOOKING_TEXT.back}
      </button>
    </div>
  );
}
