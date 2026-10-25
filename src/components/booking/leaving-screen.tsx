"use client";

import { useEffect, useRef } from "react";
import { BOOKING_TEXT, leavingText, type BookingOption } from "@/lib/booking/options";
import { PlatformLogo } from "./platform-logo";

/**
 * « Tu quittes WHERE » (docs/prototype.html, renderLeave). Le lien sortant s'ouvre dans un nouvel
 * onglet ; au retour sur WHERE (onglet de nouveau visible) ou sur « Revenir à WHERE », on demande
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
      className="fixed inset-0 z-[60] flex animate-fade flex-col items-center justify-center gap-4 bg-night p-[30px] text-center text-cream"
    >
      <div className="text-[11px] font-bold tracking-[0.14em] text-[#b9c0cc] uppercase">{BOOKING_TEXT.leavingEyebrow}</div>
      <h2 id="leaving-title" className="max-w-[420px] font-display text-[21px] font-medium leading-tight">
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
          className="inline-flex min-h-9 items-center justify-center rounded-full bg-ink px-3.5 text-[13px] font-bold text-cream transition-colors hover:bg-[#0f1722]"
        >
          {option.label}
        </a>
      </div>
      <button ref={back} type="button" onClick={onBack} className="text-[13.5px] font-semibold text-[#c8cfda] hover:underline">
        {BOOKING_TEXT.back}
      </button>
    </div>
  );
}
