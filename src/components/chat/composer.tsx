"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

export function SendIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-[18px]"
      aria-hidden
    >
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

/** Zone de saisie (docs/prototype.html, .composer / .cbox). */
export function Composer({ disabled, onSend }: { disabled: boolean; onSend: (text: string) => void }) {
  const t = useTranslations("chat");
  const tc = useTranslations("common");
  const [value, setValue] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = value.trim();
    if (!text || disabled) return;
    setValue("");
    onSend(text);
  }

  return (
    <div className="shrink-0 border-t border-line bg-paper px-3.5 pt-2.5 pb-[max(12px,env(safe-area-inset-bottom))] lg:border-t-0 lg:px-9 lg:pb-6">
      <form
        onSubmit={submit}
        className="mx-auto flex max-w-[760px] items-center gap-2 rounded-full border-[1.5px] border-line bg-paper-2 py-1.5 pe-1.5 ps-4 focus-within:border-ink"
      >
        <input
          type="text"
          name="question"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("composer.placeholder")}
          autoComplete="off"
          maxLength={500}
          aria-label={t("composer.label")}
          className="min-w-0 flex-1 bg-transparent text-[14.5px] text-ink outline-none placeholder:text-soft"
        />
        <button
          type="submit"
          aria-label={tc("send")}
          disabled={disabled}
          className="inline-flex size-[38px] shrink-0 items-center justify-center rounded-full bg-orange text-white transition-opacity disabled:opacity-50"
        >
          <SendIcon />
        </button>
      </form>
    </div>
  );
}
