import Link from "next/link";
import type { ReactNode } from "react";

/** Écrans d'accueil et d'onboarding, hors coquille de l'app (maquette .screen.onb). */
export function OnbFrame({ back, children }: { back: `/${string}`; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-1 justify-center bg-cream">
      <div className="flex w-full max-w-[680px] flex-col gap-4 px-[22px] pt-[max(22px,env(safe-area-inset-top))] pb-7 lg:px-8 lg:py-14">
        <Link
          href={back}
          aria-label="Retour"
          className="inline-flex size-[34px] items-center justify-center self-start rounded-full bg-sand-2 text-[18px]"
        >
          ‹
        </Link>
        {children}
      </div>
    </main>
  );
}

export const EYEBROW = "text-[11px] font-bold tracking-[0.14em] text-muted uppercase";
export const H1 = "font-display text-[28px] font-normal leading-[1.12] tracking-[-0.01em]";
export const CORAL_BTN =
  "inline-flex min-h-[46px] items-center justify-center rounded-full bg-coral px-5 text-[14.5px] font-bold text-white transition-colors hover:bg-[#d2644b]";
