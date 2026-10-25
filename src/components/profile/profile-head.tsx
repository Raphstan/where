"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { call } from "@/components/privacy/confirm-sheet";

const INPUT =
  "w-full rounded-xl border-[1.5px] border-line bg-cream-2 px-3.5 py-[11px] text-[14px] text-ink placeholder:text-soft focus:border-ink focus:outline-none";

/** En-tête du profil (maquette scrProfile) : avatar, prénom, ville ; modifiables sur place. */
export function ProfileHead({ name, city, email }: { name: string | null; city: string | null; email: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(name === null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const initial = (name ?? email).trim().charAt(0).toLocaleUpperCase("fr");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await call("/api/profile", "PATCH", { name: String(f.get("name") ?? ""), city: String(f.get("city") ?? "") });
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden
          className="inline-flex size-[68px] shrink-0 items-center justify-center rounded-full bg-linear-145 from-ink-2 to-ink font-display text-[24px] font-bold text-white shadow-[inset_0_-6px_12px_rgba(0,0,0,0.12)]"
        >
          {initial}
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-[28px] font-normal leading-[1.12] tracking-[-0.01em]">{name ?? "Profil"}</h1>
          <div className="text-[12.5px] text-muted">
            {city ?? "Ville non renseignée"}
            {!editing ? (
              <>
                {" · "}
                <button type="button" onClick={() => setEditing(true)} className="font-semibold text-blue hover:underline">
                  Modifier
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
      {editing ? (
        <form onSubmit={submit} className="flex flex-col gap-2.5 rounded-card border border-line bg-cream-2 p-4">
          <input name="name" defaultValue={name ?? ""} maxLength={60} placeholder="Prénom" aria-label="Prénom" className={INPUT} />
          <input name="city" defaultValue={city ?? ""} maxLength={80} placeholder="Ville" aria-label="Ville" className={INPUT} />
          <p className="text-[11.5px] text-soft">Ton prénom apparaît dans les questions que tu envoies à tes proches.</p>
          {error ? <p className="text-[12.5px] text-[#a4402c]">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-ink px-5 text-[14.5px] font-bold text-cream transition-colors hover:bg-[#0f1722] disabled:opacity-60"
          >
            Enregistrer
          </button>
        </form>
      ) : null}
    </div>
  );
}
