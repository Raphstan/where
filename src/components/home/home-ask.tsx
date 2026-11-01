"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { SendIcon } from "@/components/chat/composer";

/**
 * Boîte de question de l'accueil (maquette .chatbox, habillage de la carte « Try it » de la landing).
 * Envoyer ouvre le chat avec la question ; sans compte, le passage par la connexion la conserve.
 */
export function HomeAsk({ example, others }: { example: string; others: { key: string; text: string }[] }) {
  const router = useRouter();
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const [value, setValue] = useState("");
  return (
    <div className="flex flex-col gap-3 rounded-[22px] border-2 border-orange bg-paper-2/90 p-4 shadow-[0_18px_44px_-18px_rgba(255,90,31,0.45)] backdrop-blur-sm">
      <div className="flex items-center gap-2 font-mono text-[11px] font-medium tracking-[0.08em] text-orange-ink uppercase">
        <i aria-hidden className="size-1.5 rounded-full bg-orange" />
        {t("promise")}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const q = value.trim() || example;
          router.push(`/chat?q=${encodeURIComponent(q)}`);
        }}
        className="flex items-end gap-2 rounded-[18px] border-2 border-line-strong bg-white py-2 pe-2 ps-4 focus-within:border-ink"
      >
        <label className="relative block min-h-11 flex-1 py-1 text-[15.5px] leading-[1.45]">
          <span className="sr-only">{t("question")}</span>
          <textarea
            rows={2}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            maxLength={500}
            className="peer block w-full resize-none bg-transparent outline-none"
          />
          {value === "" ? (
            <span aria-hidden className="pointer-events-none absolute inset-0 py-1 text-ink-2">
              {example}
              <span className="ms-0.5 inline-block h-4 w-0.5 animate-caret bg-orange align-[-3px]" />
            </span>
          ) : null}
        </label>
        <button
          type="submit"
          aria-label={tc("send")}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-orange text-white"
        >
          <SendIcon />
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        {others.map((ex) => (
          <Link
            key={ex.key}
            href={`/chat?q=${encodeURIComponent(ex.text)}`}
            className="rounded-full bg-orange-2 px-3 py-1.5 text-[13px] font-medium text-[#8a2e0e] transition-colors hover:bg-[#ffd2bf]"
          >
            {ex.text}
          </Link>
        ))}
      </div>
    </div>
  );
}
