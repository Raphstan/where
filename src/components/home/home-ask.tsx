"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { SendIcon } from "@/components/chat/composer";

/**
 * Question de l'accueil : un seul champ, sans cadre autour, et trois suggestions courtes.
 * Envoyer ouvre le chat avec la question ; sans compte, le passage par la connexion la conserve.
 * Champ vide : la question d'exemple complète part à sa place.
 */
export function HomeAsk({
  example,
  suggestions,
}: {
  example: string;
  suggestions: { key: string; label: string; question: string }[];
}) {
  const router = useRouter();
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const [value, setValue] = useState("");
  return (
    <div className="flex flex-col gap-3.5">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const q = value.trim() || example;
          router.push(`/chat?q=${encodeURIComponent(q)}`);
        }}
        className="flex items-end gap-2 rounded-[22px] border-[1.5px] border-line bg-white py-2.5 pe-2.5 ps-4 shadow-soft transition-colors focus-within:border-ink"
      >
        <label className="block flex-1">
          <span className="sr-only">{t("question")}</span>
          <textarea
            rows={2}
            value={value}
            placeholder={t("placeholder")}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            maxLength={500}
            className="block min-h-12 w-full resize-none bg-transparent py-1 text-[16px] leading-[1.45] text-ink outline-none placeholder:text-soft"
          />
        </label>
        <button
          type="submit"
          aria-label={tc("send")}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-orange text-white transition-colors hover:bg-[#ee4a10]"
        >
          <SendIcon />
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <Link
            key={s.key}
            href={`/chat?q=${encodeURIComponent(s.question)}`}
            className="rounded-full border-[1.5px] border-line px-3.5 py-1.5 text-[13.5px] whitespace-nowrap text-ink-2 transition-colors hover:border-ink hover:text-ink"
          >
            {s.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
