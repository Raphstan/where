"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { usePanel } from "@/components/shell/panel-context";

/** Corps de la feuille « Confirmer » (docs/prototype.html, kind 'delete') : Annuler ou agir. */
function ConfirmBody({ message, action, onConfirm }: { message: string; action: string; onConfirm: () => Promise<void> }) {
  const { close } = usePanel();
  const t = useTranslations("privacy");
  const errorText = useErrorText();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <p>{message}</p>
      {error ? <p className="text-[12.5px] text-orange-ink">{error}</p> : null}
      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={close}
          className="inline-flex min-h-[46px] grow items-center justify-center rounded-full border-[1.5px] border-line px-5 text-[14.5px] font-bold text-ink transition-colors hover:border-ink"
        >
          {t("confirm.cancel")}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await onConfirm();
              close();
            } catch (e) {
              setError(errorText(e));
              setBusy(false);
            }
          }}
          className="inline-flex min-h-[46px] grow items-center justify-center rounded-full bg-orange px-5 text-[14.5px] font-bold text-white shadow-orange transition-colors hover:bg-[#ee4a10] disabled:opacity-60"
        >
          {action}
        </button>
      </div>
    </div>
  );
}

/** Ouvre la feuille de confirmation ; rien n'est supprimé sans ce second geste. */
export function useConfirm() {
  const { open } = usePanel();
  const t = useTranslations("privacy");
  return (key: string, message: string, action: string, onConfirm: () => Promise<void>) =>
    open({ key, title: t("confirm.title"), body: <ConfirmBody message={message} action={action} onConfirm={onConfirm} /> });
}

/**
 * Message d'une erreur levée par `call`, dans la langue de l'interface : celui du serveur (déjà
 * traduit par la route), sinon « Une erreur est survenue. ».
 */
export function useErrorText() {
  const t = useTranslations("privacy");
  return (e: unknown) => (e instanceof Error && e.message ? e.message : t("error"));
}

/**
 * Appel JSON à une route de l'app : lève le message d'erreur renvoyé par le serveur, ou une erreur
 * sans message (à afficher avec `useErrorText`).
 */
export async function call<T = unknown>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      json && typeof json === "object" && "error" in json && json.error && typeof json.error === "object" && "message" in json.error
        ? String(json.error.message)
        : "";
    throw new Error(msg);
  }
  return json as T;
}
