import Link from "next/link";
import type { ReactNode } from "react";
import { Mascot } from "./wordmark";

/** Page d'état (introuvable, erreur) : la mascotte, un titre, une phrase, des actions. */
export function StatusPage({ title, lead, children }: { title: string; lead: string; children?: ReactNode }) {
  return (
    <main className="hero flex min-h-dvh flex-1 items-center justify-center px-[22px] py-10">
      <div className="flex max-w-[440px] flex-col items-center gap-3.5 text-center">
        <Mascot className="h-[96px] w-[82px]" />
        <h1 className="font-display text-[30px] font-extrabold leading-tight">{title}</h1>
        <p className="text-[15px] text-ink-2">{lead}</p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2.5">{children}</div>
      </div>
    </main>
  );
}

export const STATUS_PRIMARY =
  "inline-flex min-h-[46px] items-center justify-center rounded-full bg-orange px-6 text-[14.5px] font-bold text-white shadow-orange transition-colors hover:bg-[#ee4a10]";

export function StatusHomeLink({ label }: { label: string }) {
  return (
    <Link href="/chat" className="px-3 text-[14px] font-semibold text-ink-2 hover:text-ink hover:underline">
      {label}
    </Link>
  );
}
