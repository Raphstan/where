import { ContextPanel } from "@/components/shell/context-panel";
import { PanelProvider } from "@/components/shell/panel-context";

/* Onboarding : plein écran, sans barre latérale ni onglets ; les feuilles s'ouvrent par-dessus. */
export default function OnboardingLayout({ children }: LayoutProps<"/onboarding">) {
  return (
    <PanelProvider>
      {children}
      <ContextPanel sheetOnly />
    </PanelProvider>
  );
}
