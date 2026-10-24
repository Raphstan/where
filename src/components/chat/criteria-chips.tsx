"use client";

import { useState } from "react";
import { CRITERIA_HINT } from "./messages";

/** Critères compris en chips retirables, plus « + ajouter » (docs/prototype.html, case 'criteria'). */
export function CriteriaChips({
  tags,
  onRemove,
  onAdd,
}: {
  tags: string[];
  onRemove: (index: number) => void;
  onAdd: (tag: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  function submit() {
    const value = draft.trim();
    if (value) onAdd(value);
    setDraft("");
    setAdding(false);
  }

  return (
    <div className="flex w-full animate-pop flex-col gap-2.5">
      <div className="pl-1 text-[11.5px] text-soft">{CRITERIA_HINT}</div>
      <div className="flex flex-wrap gap-1.5" role="list" aria-label="Critères compris">
        {tags.map((tag, i) => (
          <button
            key={`${tag}-${i}`}
            type="button"
            role="listitem"
            onClick={() => onRemove(i)}
            aria-label={`Retirer le critère ${tag}`}
            className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-transparent bg-blue-2 py-1.5 pr-2 pl-2.5 text-[12.5px] font-semibold text-blue transition-colors hover:border-blue"
          >
            {tag}
            <span aria-hidden className="text-[15px] leading-none opacity-60">
              ×
            </span>
          </button>
        ))}
        {adding ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="inline-flex"
          >
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={submit}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setDraft("");
                  setAdding(false);
                }
              }}
              maxLength={40}
              placeholder="un critère…"
              aria-label="Nouveau critère"
              className="w-[140px] rounded-full border-[1.5px] border-ink bg-cream-2 px-2.5 py-1.5 text-[12.5px] text-ink outline-none placeholder:text-soft"
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center rounded-full border-[1.5px] border-line bg-cream-2 px-2.5 py-1.5 text-[12.5px] font-semibold text-ink transition-colors hover:border-ink"
          >
            + ajouter
          </button>
        )}
      </div>
    </div>
  );
}
