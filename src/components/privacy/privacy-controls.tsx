"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useToast } from "@/components/shell/toast";
import { USAGE_KEYS, type UsagePrefs } from "@/lib/privacy/usage";
import { call, useConfirm, useErrorText } from "./confirm-sheet";

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
        checked ? "bg-orange after:start-[21px]" : "bg-line-strong after:start-[3px]"
      }`}
    />
  );
}

/** « Utilisé pour les recommandations » : chaque interrupteur est enregistré aussitôt. */
export function UsageToggles({ initial }: { initial: UsagePrefs }) {
  const [usage, setUsage] = useState(initial);
  const toast = useToast();
  const t = useTranslations("privacy");
  const errorText = useErrorText();
  return (
    <>
      {USAGE_KEYS.map((k) => {
        const label = t(`usage.${k}`);
        return (
        <div key={k} className="flex items-center justify-between gap-3 py-[13px]">
          <span className="text-[12.5px] text-muted">{label}</span>
          <Switch
            checked={usage[k]}
            label={label}
            onChange={() => {
              const before = usage;
              const next = { ...usage, [k]: !usage[k] };
              setUsage(next);
              call("/api/privacy", "PATCH", { [k]: next[k] }).catch((e: unknown) => {
                setUsage(before);
                toast.show(errorText(e));
              });
            }}
          />
        </div>
        );
      })}
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
  const t = useTranslations("privacy");
  // Le bouton est désactivé à 0 : un seul lieu, ou plusieurs.
  const placesConfirm =
    importedPlaces > 1 ? t("delete.placesConfirmMany", { count: importedPlaces }) : t("delete.placesConfirmOne");
  return (
    <>
      <button
        type="button"
        disabled={!emailSource}
        className={`${GHOST} border-line text-ink hover:border-ink`}
        onClick={() =>
          confirm(
            "delete-source",
            t("delete.sourceConfirm"),
            t("delete.sourceAction"),
            async () => {
              await call("/api/sources/email", "DELETE");
              toast.show(t("delete.sourceDone"));
              router.refresh();
            },
          )
        }
      >
        {t("delete.source")}
      </button>
      <button
        type="button"
        disabled={importedPlaces === 0}
        className={`${GHOST} border-line text-ink hover:border-ink`}
        onClick={() =>
          confirm(
            "delete-places",
            placesConfirm,
            t("delete.placesAction"),
            async () => {
              const { removed } = await call<{ removed: number }>("/api/imports", "DELETE");
              toast.show(t("delete.placesDone", { count: removed }));
              router.refresh();
            },
          )
        }
      >
        {t("delete.places")}
      </button>
      <button
        type="button"
        className={`${GHOST} border-orange-2 text-orange-ink hover:border-orange`}
        onClick={() =>
          confirm(
            "delete-account",
            t("delete.accountConfirm"),
            t("delete.account"),
            async () => {
              await call("/api/account", "DELETE");
              router.replace("/");
              router.refresh();
            },
          )
        }
      >
        {t("delete.account")}
      </button>
      {toast.node}
    </>
  );
}
