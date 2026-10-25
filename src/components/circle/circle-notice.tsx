/** « Ce cercle est privé. » (maquette scrCircleSetup). */
export function CircleNotice() {
  return (
    <div className="flex items-start gap-2.5 rounded-[14px] bg-sand-2 px-3.5 py-3 text-[13.5px] text-ink-2">
      <span aria-hidden className="shrink-0">
        🔒
      </span>
      <span>Ce cercle est privé. Personne ne voit qu’il en fait partie, et rien n’est publié.</span>
    </div>
  );
}
