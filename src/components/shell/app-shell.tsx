import type { ReactNode } from "react";
import { ContextPanel } from "./context-panel";
import { MobileTabs } from "./nav-links";
import { PanelProvider } from "./panel-context";
import { Sidebar } from "./sidebar";
import { Wordmark } from "./wordmark";

/**
 * Coquille de l'application.
 * Mobile : barre du haut + contenu + 4 onglets.
 * Desktop : barre latérale | contenu | panneau contextuel (feuille sous 1280 px).
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <PanelProvider>
      <div className="flex min-h-dvh flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center gap-2.5 px-[18px] pt-[max(14px,env(safe-area-inset-top))] pb-2.5 lg:hidden">
            <Wordmark />
          </header>
          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</main>
          <MobileTabs />
        </div>
        <ContextPanel />
      </div>
    </PanelProvider>
  );
}
