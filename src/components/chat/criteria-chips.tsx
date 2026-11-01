"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

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
  const t = useTranslations("chat");
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
      <div className="ps-1 text-[11.5px] text-soft">{t("criteria.hint")}</div>
      <div className="flex flex-wrap gap-1.5" role="list" aria-label={t("criteria.list")}>
        {tags.map((tag, i) => (
          <button
            key={`${tag}-${i}`}
            type="button"
            role="listitem"
            onClick={() => onRemove(i)}
            aria-label={t("criteria.remove", { tag })}
            className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-transparent bg-blue-2 py-1.5 pe-2 ps-2.5 text-[12.5px] font-semibold text-blue transition-colors hover:border-blue"
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
              placeholder={t("criteria.placeholder")}
              aria-label={t("criteria.new")}
              className="w-[140px] rounded-full border-[1.5px] border-ink bg-paper-2 px-2.5 py-1.5 text-[12.5px] text-ink outline-none placeholder:text-soft"
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center rounded-full border-[1.5px] border-line bg-paper-2 px-2.5 py-1.5 text-[12.5px] font-semibold text-ink transition-colors hover:border-ink"
          >
            {t("criteria.add")}
          </button>
        )}
      </div>
    </div>
  );
}
