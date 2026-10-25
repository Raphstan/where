"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/shell/toast";
import { USAGE_LABELS, type UsagePrefs } from "@/lib/privacy/usage";
import { call, useConfirm } from "./confirm-sheet";

/** Interrupteur de la maquette (.sw). */
export function Switch({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-[26px] w-11 shrink-0 rounded-full transition-colors after:absolute after:top-[3px] after:size-5 after:rounded-full after:bg-white after:shadow-[0_1px_3px_rgba(0,0,0,0.2)] after:transition-all after:content-[''] ${
        checked ? "bg-olive after:left-[21px]" : "bg-line after:left-[3px]"
      }`}
    />
  );
}

/** « Utilisé pour les recommandations » : chaque interrupteur est enregistré aussitôt. */
export function UsageToggles({ initial }: { initial: UsagePrefs }) {
  const [usage, setUsage] = useState(initial);
  const toast = useToast();
  return (
    <>
      {USAGE_LABELS.map(([k, label]) => (
        <div key={k} className="flex items-center justify-between gap-3 py-[13px]">
          <span className="text-[12.5px] text-muted">{label}</span>
          <Switch
            checked={usage[k]}
            label={label}
            onChange={() => {
              const before = usage;
              const next = { ...usage, [k]: !usage[k] };
              setUsage(next);
              call("/api/privacy", "PATCH", { [k]: next[k] }).catch((e: Error) => {
                setUsage(before);
                toast.show(e.message);
              });
            }}
          />
        </div>
      ))}
      {toast.node}
    </>
  );
}

const GHOST =
  "inline-flex min-h-[46px] w-full items-center justify-center rounded-full border-[1.5px] px-5 text-[14.5px] font-bold transition-colors disabled:opacity-50";

/** « Supprimer » : source, lieux importés, compte. Chaque suppression passe par « Confirmer ». */
export function DeleteActions({ emailSource, importedPlaces }: { emailSource: boolean; importedPlaces: number }) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const places = importedPlaces > 1 ? `les ${importedPlaces} lieux importés` : "le lieu importé";
  return (
    <>
      <button
        type="button"
        disabled={!emailSource}
        className={`${GHOST} border-line text-ink hover:border-ink`}
        onClick={() =>
          confirm(
            "delete-source",
            "Supprimer la source « transfert d’email » ? Les futures confirmations ne seront plus lues.",
            "Supprimer la source",
            async () => {
              await call("/api/sources/email", "DELETE");
              toast.show("Source « transfert d’email » supprimée");
              router.refresh();
            },
          )
        }
      >
        Supprimer une source
      </button>
      <button
        type="button"
        disabled={importedPlaces === 0}
        className={`${GHOST} border-line text-ink hover:border-ink`}
        onClick={() =>
          confirm(
            "delete-places",
            `Supprimer ${places} ? Tes recommandations manuelles et les réponses de ton cercle sont conservées.`,
            "Supprimer les lieux",
            async () => {
              const { removed } = await call<{ removed: number }>("/api/imports", "DELETE");
              toast.show(removed > 1 ? `${removed} lieux importés supprimés` : `${removed} lieu importé supprimé`);
              router.refresh();
            },
          )
        }
      >
        Supprimer tous les lieux importés
      </button>
      <button
        type="button"
        className={`${GHOST} border-coral-2 text-[#a4402c] hover:border-coral`}
        onClick={() =>
          confirm(
            "delete-account",
            "Supprimer ton compte et toutes tes données ? Cette action est définitive.",
            "Supprimer mon compte",
            async () => {
              await call("/api/account", "DELETE");
              router.replace("/");
              router.refresh();
            },
          )
        }
      >
        Supprimer mon compte
      </button>
      {toast.node}
    </>
  );
}
