"use client";

import { useTranslations } from "next-intl";
import { useState, type FormEvent, type KeyboardEvent } from "react";

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

/**
 * Zone de saisie (docs/prototype.html, .composer / .cbox).
 * `hero` : chat vide, grand champ au centre de l'écran, comme Happenstance ou ChatGPT. Entrée envoie,
 * Maj + Entrée passe à la ligne.
 */
export function Composer({
  disabled,
  onSend,
  hero = false,
}: {
  disabled: boolean;
  onSend: (text: string) => void;
  hero?: boolean;
}) {
  const t = useTranslations("chat");
  const tc = useTranslations("common");
  const [value, setValue] = useState("");

  function send() {
    const text = value.trim();
    if (!text || disabled) return;
    setValue("");
    onSend(text);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    send();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  }

  const sendButton = (
    <button
      type="submit"
      aria-label={tc("send")}
      disabled={disabled || (hero && !value.trim())}
      className="inline-flex size-[38px] shrink-0 items-center justify-center rounded-full bg-orange text-white transition-opacity disabled:opacity-40"
    >
      <SendIcon />
    </button>
  );

  if (hero) {
    return (
      <form
        onSubmit={submit}
        className="flex w-full flex-col gap-1 rounded-[22px] border-[1.5px] border-line bg-paper-2 px-4 pt-3.5 pb-2.5 shadow-soft focus-within:border-line-strong"
      >
        <textarea
          name="question"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t("composer.placeholder")}
          autoComplete="off"
          maxLength={500}
          rows={2}
          aria-label={t("composer.label")}
          className="w-full resize-none bg-transparent text-[16px] leading-snug text-ink outline-none placeholder:text-soft"
        />
        <div className="flex justify-end">{sendButton}</div>
      </form>
    );
  }

  return (
    <div className="shrink-0 bg-paper px-3.5 pt-2 pb-[max(12px,env(safe-area-inset-bottom))] lg:px-9 lg:pb-6">
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
          className="min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-soft"
        />
        {sendButton}
      </form>
    </div>
  );
}
