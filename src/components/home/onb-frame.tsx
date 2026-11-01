import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/shell/wordmark";

/** Écrans d'accueil et d'onboarding, hors coquille de l'app (maquette .screen.onb). */
export function OnbFrame({ back, children }: { back: `/${string}`; children: ReactNode }) {
  return (
    <main className="hero flex min-h-dvh flex-1 justify-center">
      <div className="flex w-full max-w-[680px] flex-col gap-4 px-[22px] [&>*]:shrink-0 pt-[max(22px,env(safe-area-inset-top))] pb-7 lg:px-8 lg:py-14">
        <div className="flex items-center gap-3">
          <Link
            href={back}
            aria-label="Retour"
            className="inline-flex size-[36px] items-center justify-center rounded-full bg-paper-2 text-[18px] shadow-soft"
          >
            ‹
          </Link>
          <Wordmark />
        </div>
        {children}
      </div>
    </main>
  );
}

export const EYEBROW = "font-mono text-[11px] font-medium tracking-[0.08em] text-muted uppercase";
export const H1 = "font-display text-[32px] font-extrabold leading-[1.05] tracking-[-0.02em] lg:text-[44px]";
export const ORANGE_BTN =
  "inline-flex min-h-[46px] items-center justify-center rounded-full bg-orange px-5 text-[14.5px] font-bold text-white shadow-orange transition-colors hover:bg-[#ee4a10]";
