/** Colonne de droite, desktop large uniquement (docs/prototype.html, .rpanel). */
export function ContextPanel() {
  return (
    <aside className="hidden w-[380px] shrink-0 flex-col border-l border-line bg-cream-2 xl:flex">
      <div className="flex items-center gap-2.5 border-b border-line px-[18px] py-4">
        <h2 className="font-display text-[21px] font-medium leading-tight">Détails</h2>
      </div>
      <div className="flex flex-1 items-center justify-center p-[18px]">
        <p className="max-w-[240px] text-center text-[12.5px] text-muted">
          « Pourquoi ce choix ? », la carte et les moyens de réserver s&apos;ouvriront ici.
        </p>
      </div>
    </aside>
  );
}
