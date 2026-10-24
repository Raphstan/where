import type { Metadata } from "next";

export const metadata: Metadata = { title: "Conversation" };

/* État vide de la conversation (docs/prototype.html, scrChat → emptyState). */
export default function ChatPage() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-3.5 px-6 py-8 text-center">
        <span
          aria-hidden
          className="inline-flex size-[52px] items-center justify-center rounded-full bg-coral font-display text-[20px] font-medium text-white"
        >
          W
        </span>
        <h1 className="font-display text-[21px] font-medium leading-tight">
          Où devrais-tu vraiment aller ?
        </h1>
        <p className="max-w-[360px] text-[12.5px] text-muted">
          Pose ta question comme à un ami. Je regarde d&apos;abord ce que ton cercle sait, puis je
          complète avec le public.
        </p>
      </div>
      <div className="shrink-0 border-t border-line bg-cream px-3.5 pt-2.5 pb-3 lg:border-t-0 lg:px-9 lg:pb-6">
        <form className="mx-auto flex max-w-[760px] items-center gap-2 rounded-full border-[1.5px] border-line bg-cream-2 py-1.5 pr-1.5 pl-4 focus-within:border-ink">
          <input
            type="text"
            name="question"
            placeholder="Où devrais-tu aller… ?"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-[14.5px] text-ink outline-none placeholder:text-soft"
          />
          <button
            type="submit"
            aria-label="Envoyer"
            className="inline-flex size-[38px] shrink-0 items-center justify-center rounded-full bg-coral text-white"
          >
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
          </button>
        </form>
      </div>
    </div>
  );
}
