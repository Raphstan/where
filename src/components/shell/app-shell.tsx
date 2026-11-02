import type { ReactNode } from "react";
import { ContextPanel } from "./context-panel";
import { InstallBanner } from "./install-banner";
import { MobileTopBar } from "./mobile-drawer";
import { PanelProvider } from "./panel-context";
import { Sidebar, SidebarContent } from "./sidebar";

/**
 * Coquille de l'application, sur le modèle de ChatGPT, Claude ou Happenstance.
 * Mobile : barre du haut (menu en tiroir, nouvelle question) + contenu.
 * Desktop : barre latérale | contenu | panneau contextuel, seulement quand il est ouvert.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <PanelProvider>
      {/* Hauteur fixe de l'écran : seul le contenu défile, jamais la page (sinon iPhone la décale au clavier). */}
      <div className="flex h-dvh flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <MobileTopBar sidebar={<SidebarContent />} />
          <InstallBanner />
          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</main>
        </div>
        <ContextPanel />
      </div>
    </PanelProvider>
  );
}
