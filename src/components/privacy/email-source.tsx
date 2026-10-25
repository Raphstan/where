"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/shell/toast";
import { call, useConfirm } from "./confirm-sheet";

const XS =
  "inline-flex min-h-[30px] items-center justify-center rounded-full px-[11px] py-1.5 text-[12.5px] font-semibold transition-colors disabled:opacity-60";

/** Actions de la source « transfert d'email » (maquette scrSources, Gmail : Connecter / Déconnecter). */
export function EmailSourceActions({ connected }: { connected: boolean }) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  if (!connected) {
    return (
      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          disabled={busy}
          className={`${XS} bg-ink text-cream hover:bg-[#0f1722]`}
          onClick={async () => {
            setBusy(true);
            try {
              await call("/api/sources/email", "POST");
              router.push("/import");
              router.refresh();
            } catch (e) {
              toast.show(e instanceof Error ? e.message : "Une erreur est survenue.");
              setBusy(false);
            }
          }}
        >
          Connecter
        </button>
        {toast.node}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2.5">
      <Link href="/import" className={`${XS} border-[1.5px] border-line text-ink hover:border-ink`}>
        Voir l’adresse de transfert
      </Link>
      <button
        type="button"
        className={`${XS} border-[1.5px] border-line text-ink hover:border-ink`}
        onClick={() =>
          confirm(
            "disconnect-email",
            "Déconnecter le transfert d’email ? Les lieux déjà importés restent, sauf si tu les supprimes.",
            "Déconnecter",
            async () => {
              await call("/api/sources/email", "DELETE");
              toast.show("Transfert d’email déconnecté");
              router.refresh();
            },
          )
        }
      >
        Déconnecter
      </button>
      {toast.node}
    </div>
  );
}
