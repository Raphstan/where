"use client";

import { useEffect } from "react";
import { usePanel } from "./panel-context";

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Fermer"
      className="ml-auto inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-sand-2 text-base"
    >
      ×
    </button>
  );
}

/**
 * Colonne de droite sur desktop large (docs/prototype.html, .rpanel), feuille ailleurs (.sheet) :
 * bottom sheet sur mobile, fenêtre centrée entre les deux. `sheetOnly` : toujours une feuille
 * (écrans d'onboarding, sans colonne de droite).
 */
export function ContextPanel({ sheetOnly = false }: { sheetOnly?: boolean }) {
  const { panel, close } = usePanel();

  useEffect(() => {
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel, close]);

  return (
    <>
      <aside className={sheetOnly ? "hidden" : "hidden w-[380px] shrink-0 flex-col border-l border-line bg-cream-2 xl:flex"}>
        <div className="flex items-center gap-2.5 border-b border-line px-[18px] py-4">
          <h2 className="font-display text-[21px] font-medium leading-tight">{panel ? panel.title : "Détails"}</h2>
          {panel ? <CloseButton onClick={close} /> : null}
        </div>
        {panel ? (
          <div key={panel.key} className="flex-1 animate-slide-l overflow-auto p-[18px]">
            {panel.body}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center p-[18px]">
            <p className="max-w-[240px] text-center text-[12.5px] text-muted">
              « Pourquoi ce choix ? », la carte et les moyens de réserver s&apos;ouvriront ici.
            </p>
          </div>
        )}
      </aside>

      {panel ? (
        <div
          className={`fixed inset-0 z-40 flex animate-fade items-end bg-ink/45 backdrop-blur-[2px] lg:items-center lg:justify-center ${sheetOnly ? "" : "xl:hidden"}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={panel.title}
            className="flex max-h-[88%] w-full animate-up flex-col rounded-t-[28px] bg-cream lg:max-h-[85%] lg:max-w-[520px] lg:rounded-[24px] lg:shadow-soft"
          >
            <div className="mx-auto mt-2.5 h-1 w-10 rounded-sm bg-line lg:hidden" />
            <div className="flex items-center gap-2.5 px-5 pt-3.5 pb-2">
              <h2 className="font-display text-[21px] font-medium leading-tight">{panel.title}</h2>
              <CloseButton onClick={close} />
            </div>
            <div className="overflow-auto px-5 pt-2 pb-7">{panel.body}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
