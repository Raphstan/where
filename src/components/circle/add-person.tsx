"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { call } from "@/components/privacy/confirm-sheet";
import { usePanel } from "@/components/shell/panel-context";
import { useToast } from "@/components/shell/toast";

type Channel = "phone" | "email";
type Prefill = { name?: string; phone?: string; email?: string };

/** Contact Picker API (Chrome Android) : absente ailleurs, l'option « Depuis mes contacts » est alors masquée. */
type ContactsManager = {
  select: (props: string[], opts?: { multiple?: boolean }) => Promise<{ name?: string[]; tel?: string[]; email?: string[] }[]>;
};
function contactsApi(): ContactsManager | null {
  if (typeof navigator === "undefined") return null;
  const c = (navigator as Navigator & { contacts?: ContactsManager }).contacts;
  return c && typeof c.select === "function" ? c : null;
}

const INPUT =
  "w-full rounded-xl border-[1.5px] border-line bg-cream-2 px-3.5 py-[11px] text-[14px] text-ink placeholder:text-soft focus:border-ink focus:outline-none";

function MemberForm({ channel, prefill, onDone }: { channel: Channel; prefill: Prefill; onDone: (name: string) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      name: String(f.get("name") ?? ""),
      relation: String(f.get("relation") ?? ""),
      description: String(f.get("description") ?? ""),
      phone: channel === "phone" ? String(f.get("contact") ?? "") : "",
      email: channel === "email" ? String(f.get("contact") ?? "") : "",
    };
    setBusy(true);
    setError(null);
    try {
      await call("/api/circle", "POST", body);
      onDone(body.name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2.5">
      <input name="name" required maxLength={60} defaultValue={prefill.name} placeholder="Prénom" aria-label="Prénom" className={INPUT} />
      <input name="relation" maxLength={60} placeholder="Amie proche, frère, collègue…" aria-label="Relation" className={INPUT} />
      <input
        name="description"
        maxLength={200}
        placeholder="Restaurants romantiques et hôtels"
        aria-label="Ce pour quoi tu lui fais confiance"
        className={INPUT}
      />
      <input
        name="contact"
        required
        type={channel === "phone" ? "tel" : "email"}
        defaultValue={channel === "phone" ? prefill.phone : prefill.email}
        placeholder={channel === "phone" ? "Numéro WhatsApp" : "Email"}
        aria-label={channel === "phone" ? "Numéro WhatsApp" : "Email"}
        className={INPUT}
      />
      {error ? <p className="text-[12.5px] text-[#a4402c]">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-ink px-5 text-[14.5px] font-bold text-cream transition-colors hover:bg-[#0f1722] disabled:opacity-60"
      >
        Ajouter une personne
      </button>
    </form>
  );
}

function Choice({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3.5 rounded-card border-[1.5px] border-line bg-cream-2 p-4 text-left transition hover:-translate-y-px hover:border-ink"
    >
      <span aria-hidden className="inline-flex size-[42px] shrink-0 items-center justify-center rounded-[14px] bg-sand-2 text-[19px]">
        {icon}
      </span>
      <span className="font-bold">{label}</span>
      <span aria-hidden className="ml-auto text-soft">
        ›
      </span>
    </button>
  );
}

/** Feuille « Ajouter une personne » (maquette kind 'invite'). Rien n'est envoyé à la personne. */
function InviteBody({ onDone }: { onDone: (name: string) => void }) {
  const [step, setStep] = useState<{ channel: Channel; prefill: Prefill } | null>(null);
  const contacts = contactsApi();

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12.5px] text-muted">
        La personne ne saura pas qu’elle fait partie de ton cercle, sauf si tu lui demandes quelque chose.
      </p>
      {step ? (
        <MemberForm channel={step.channel} prefill={step.prefill} onDone={onDone} />
      ) : (
        <>
          {contacts ? (
            <Choice
              icon="📇"
              label="Depuis mes contacts"
              onClick={async () => {
                const [c] = await contacts.select(["name", "tel", "email"], { multiple: false }).catch(() => []);
                if (!c) return;
                const phone = c.tel?.[0];
                setStep({
                  channel: phone || !c.email?.[0] ? "phone" : "email",
                  prefill: { name: c.name?.[0]?.split(" ")[0], phone, email: c.email?.[0] },
                });
              }}
            />
          ) : null}
          <Choice icon="💬" label="Envoyer un lien WhatsApp" onClick={() => setStep({ channel: "phone", prefill: {} })} />
          <Choice icon="✉️" label="Inviter par email" onClick={() => setStep({ channel: "email", prefill: {} })} />
        </>
      )}
    </div>
  );
}

export function AddPersonButton() {
  const { open, close } = usePanel();
  const router = useRouter();
  const toast = useToast();
  return (
    <>
      <button
        type="button"
        onClick={() =>
          open({
            key: "invite",
            title: "Ajouter une personne",
            body: (
              <InviteBody
                onDone={(name) => {
                  close();
                  toast.show(`${name} — prêt`);
                  router.refresh();
                }}
              />
            ),
          })
        }
        className="flex w-full items-center gap-3.5 rounded-card border-[1.5px] border-line bg-cream-2 p-4 text-left transition hover:-translate-y-px hover:border-ink"
      >
        <span aria-hidden className="inline-flex size-[42px] shrink-0 items-center justify-center rounded-[14px] bg-sand-2 text-[19px]">
          +
        </span>
        <span>
          <span className="block font-bold">Ajouter une personne</span>
          <span className="block text-[12.5px] text-muted">Contact, lien WhatsApp ou email</span>
        </span>
        <span aria-hidden className="ml-auto text-soft">
          ›
        </span>
      </button>
      {toast.node}
    </>
  );
}
