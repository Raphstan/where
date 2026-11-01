import { ContextPanel } from "@/components/shell/context-panel";
import { PanelProvider } from "@/components/shell/panel-context";

/* Démonstration : plein écran ; « Pourquoi ce choix ? » s'ouvre en feuille. */
export default function DemoLayout({ children }: LayoutProps<"/[locale]/demo">) {
  return (
    <PanelProvider>
      {children}
      <ContextPanel sheetOnly />
    </PanelProvider>
  );
}
