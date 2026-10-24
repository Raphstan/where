import Link from "next/link";
import { SidebarLinks } from "./nav-links";
import { Wordmark } from "./wordmark";

/** Colonne de gauche, desktop uniquement (docs/prototype.html, .side). */
export function Sidebar() {
  return (
    <aside className="hidden w-[248px] shrink-0 flex-col border-r border-line bg-cream px-3.5 py-[18px] lg:flex">
      <div className="px-2 pt-1 pb-4">
        <Wordmark className="text-base" />
      </div>

      <Link
        href="/chat"
        className="flex min-h-9 items-center justify-center rounded-full bg-sand-2 px-3.5 text-[13px] font-bold text-ink transition-colors hover:bg-sand"
      >
        + Nouvelle question
      </Link>

      <div className="mt-3.5 flex flex-1 flex-col gap-0.5 overflow-auto">
        <div className="px-2.5 pt-3.5 pb-1.5 text-[11px] font-bold tracking-[0.14em] text-muted uppercase">
          Historique
        </div>
        <p className="px-2.5 py-2 text-[12.5px] text-soft">
          Tes questions apparaîtront ici.
        </p>
      </div>

      <SidebarLinks />

      <div className="mt-2.5 flex items-center gap-2.5 border-t border-line px-2 pt-2.5">
        <span
          aria-hidden
          className="inline-flex size-[34px] shrink-0 items-center justify-center rounded-full bg-linear-145 from-ink-2 to-ink font-display text-[13px] font-bold text-white"
        >
          ·
        </span>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-bold">Toi</div>
          <Link href="/profile" className="text-[11.5px] font-semibold text-blue hover:underline">
            Profil
          </Link>
        </div>
      </div>
    </aside>
  );
}
