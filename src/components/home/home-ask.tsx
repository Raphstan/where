"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SendIcon } from "@/components/chat/composer";

/**
 * Boîte de question de l'accueil (maquette .chatbox). Envoyer ouvre le chat avec la question ;
 * sans compte, le passage par la connexion la conserve.
 */
export function HomeAsk({ example }: { example: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim() || example;
        router.push(`/chat?q=${encodeURIComponent(q)}`);
      }}
      className="rounded-[22px] bg-cream px-4 pt-4 pb-3 text-left text-ink shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] lg:mx-auto lg:w-full lg:max-w-[680px]"
    >
      <label className="relative block min-h-11 text-[15.5px] leading-[1.45]">
        <span className="sr-only">Ta question</span>
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
          <span aria-hidden className="pointer-events-none absolute inset-0">
            {example}
            <span className="ml-0.5 inline-block h-4 w-0.5 animate-caret bg-coral align-[-3px]" />
          </span>
        ) : null}
      </label>
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-[11.5px] text-soft">Demande à ton réseau, sans avoir à demander à tout le monde.</span>
        <button
          type="submit"
          aria-label="Envoyer"
          className="inline-flex size-[38px] shrink-0 items-center justify-center rounded-full bg-coral text-white"
        >
          <SendIcon />
        </button>
      </div>
    </form>
  );
}
