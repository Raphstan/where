"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Panneau contextuel (« Pourquoi ce choix ? », carte, réservation).
 * Desktop large : colonne de droite. Ailleurs : feuille (bottom sheet sur mobile).
 */
export type Panel = { key: string; title: string; body: ReactNode };

type PanelState = {
  panel: Panel | null;
  open: (panel: Panel) => void;
  close: () => void;
};

const PanelContext = createContext<PanelState | null>(null);

export function PanelProvider({ children }: { children: ReactNode }) {
  const [panel, setPanel] = useState<Panel | null>(null);
  const open = useCallback((p: Panel) => setPanel(p), []);
  const close = useCallback(() => setPanel(null), []);
  const value = useMemo(() => ({ panel, open, close }), [panel, open, close]);
  return <PanelContext.Provider value={value}>{children}</PanelContext.Provider>;
}

export function usePanel(): PanelState {
  const ctx = useContext(PanelContext);
  if (!ctx) throw new Error("usePanel doit être utilisé sous <PanelProvider>.");
  return ctx;
}
