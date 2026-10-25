"use client";

import { useState } from "react";
import { usePanel } from "@/components/shell/panel-context";

/** Corps de la feuille « Confirmer » (docs/prototype.html, kind 'delete') : Annuler ou agir. */
function ConfirmBody({ message, action, onConfirm }: { message: string; action: string; onConfirm: () => Promise<void> }) {
  const { close } = usePanel();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <p>{message}</p>
      {error ? <p className="text-[12.5px] text-[#a4402c]">{error}</p> : null}
      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={close}
          className="inline-flex min-h-[46px] grow items-center justify-center rounded-full border-[1.5px] border-line px-5 text-[14.5px] font-bold text-ink transition-colors hover:border-ink"
        >
          Annuler
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
              setError(e instanceof Error ? e.message : "Une erreur est survenue.");
              setBusy(false);
            }
          }}
          className="inline-flex min-h-[46px] grow items-center justify-center rounded-full bg-coral px-5 text-[14.5px] font-bold text-white transition-colors hover:bg-[#d2644b] disabled:opacity-60"
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
  return (key: string, message: string, action: string, onConfirm: () => Promise<void>) =>
    open({ key, title: "Confirmer", body: <ConfirmBody message={message} action={action} onConfirm={onConfirm} /> });
}

/** Appel JSON à une route de l'app : lève le message d'erreur renvoyé par le serveur. */
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
        : "Une erreur est survenue.";
    throw new Error(msg);
  }
  return json as T;
}
