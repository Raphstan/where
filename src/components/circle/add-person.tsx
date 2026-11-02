"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { InviteResponse } from "@/app/api/circle/invite/route";
import { ForwardMailLogo, WhatsAppLogo } from "@/components/sources/brand-logos";
import { call, useErrorText } from "@/components/privacy/confirm-sheet";
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
  "w-full rounded-xl border-[1.5px] border-line bg-paper-2 px-3.5 py-[11px] text-[14px] text-ink placeholder:text-soft focus:border-ink focus:outline-none";

function MemberForm({ channel, prefill, onDone }: { channel: Channel; prefill: Prefill; onDone: (name: string) => void }) {
  const t = useTranslations("circle");
  const errorText = useErrorText();
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
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2.5">
      <input name="name" required maxLength={60} defaultValue={prefill.name} placeholder={t("form.name")} aria-label={t("form.name")} className={INPUT} />
      <input name="relation" maxLength={60} placeholder={t("form.relationPlaceholder")} aria-label={t("form.relation")} className={INPUT} />
      <input
        name="description"
        maxLength={200}
        placeholder={t("form.descriptionPlaceholder")}
        aria-label={t("form.description")}
        className={INPUT}
      />
      <input
        name="contact"
        required
        type={channel === "phone" ? "tel" : "email"}
        defaultValue={channel === "phone" ? prefill.phone : prefill.email}
        placeholder={channel === "phone" ? t("form.whatsapp") : t("form.email")}
        aria-label={channel === "phone" ? t("form.whatsapp") : t("form.email")}
        className={INPUT}
      />
      {error ? <p className="text-[12.5px] text-orange-ink">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-ink px-5 text-[14.5px] font-bold text-paper transition-colors hover:bg-night disabled:opacity-60"
      >
        {t("add.title")}
      </button>
    </form>
  );
}

const BIG =
  "flex min-h-[54px] w-full items-center gap-3 rounded-card border-[1.5px] border-line bg-paper-2 px-4 text-start text-[15px] font-bold text-ink transition hover:border-ink aria-disabled:pointer-events-none aria-disabled:opacity-50";

function BigLink({ href, icon, label, onUse }: { href: string | null; icon: ReactNode; label: string; onUse: () => void }) {
  return (
    <a href={href ?? undefined} aria-disabled={!href} onClick={onUse} className={BIG}>
      <span className="inline-flex size-8 shrink-0 items-center justify-center [&>svg]:size-[22px]">{icon}</span>
      {label}
    </a>
  );
}

type InviteResult = { kind: "ok"; invite: InviteResponse } | { kind: "name_required" } | { kind: "failed"; error: Error };

/** Crée le lien d'invitation ; 409 name_required tant que le demandeur n'a pas de prénom. */
async function requestInvite(name?: string): Promise<InviteResult> {
  const res = await fetch("/api/circle/invite", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(name ? { name } : {}),
  }).catch(() => null);
  const json: unknown = res ? await res.json().catch(() => null) : null;
  if (res?.ok && json && typeof json === "object" && "waUrl" in json) return { kind: "ok", invite: json as InviteResponse };
  const err = (json as { error?: { code?: string; message?: string } } | null)?.error;
  if (err?.code === "name_required") return { kind: "name_required" };
  return { kind: "failed", error: new Error(err?.message ?? "") };
}

/**
 * Feuille « Ajouter une personne », sur le modèle de Happenstance : un lien d'invitation est préparé
 * dès l'ouverture, et chaque bouton ouvre directement WhatsApp ou l'email avec le message prêt.
 * L'utilisateur choisit le contact et envoie lui-même. Le proche entre dans le cercle à sa réponse.
 * Le formulaire d'origine (prénom, numéro…) reste accessible en dernier recours.
 */
function InviteBody({ onDone, onSent, onCopied }: { onDone: (name: string) => void; onSent: () => void; onCopied: () => void }) {
  const [manual, setManual] = useState<{ channel: Channel; prefill: Prefill } | null>(null);
  const [invite, setInvite] = useState<InviteResponse | null>(null);
  const contacts = contactsApi();
  const t = useTranslations("circle");
  const errorText = useErrorText();
  const [failed, setFailed] = useState<unknown>(null);

  // Sans prénom, le proche verrait « la personne qui te demande » : on le demande d'abord.
  const [needName, setNeedName] = useState(false);
  const [sending, setSending] = useState(false);

  // Un seul lien par ouverture de la feuille (l'effet ne dépend de rien).
  useEffect(() => {
    let cancelled = false;
    void requestInvite().then((r) => {
      if (cancelled) return;
      if (r.kind === "ok") setInvite(r.invite);
      else if (r.kind === "name_required") setNeedName(true);
      else setFailed(r.error);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submitName(name: string) {
    setSending(true);
    const r = await requestInvite(name);
    setSending(false);
    if (r.kind === "ok") {
      setInvite(r.invite);
      setNeedName(false);
      setFailed(null);
    } else if (r.kind === "failed") setFailed(r.error);
  }
  const error = failed ? errorText(failed) : null;

  if (manual) return <MemberForm channel={manual.channel} prefill={manual.prefill} onDone={onDone} />;

  if (needName) {
    return (
      <form
        className="flex flex-col gap-2.5"
        onSubmit={async (e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const name = String(new FormData(e.currentTarget).get("name") ?? "").trim();
          if (name && !sending) await submitName(name);
        }}
      >
        <p className="font-bold">{t("invite.nameTitle")}</p>
        <p className="text-[13.5px] text-ink-2">{t("invite.nameLead")}</p>
        <input
          name="name"
          required
          maxLength={60}
          autoComplete="given-name"
          placeholder={t("invite.namePlaceholder")}
          aria-label={t("invite.namePlaceholder")}
          className={INPUT}
        />
        {error ? <p className="text-[12.5px] text-orange-ink">{error}</p> : null}
        <button
          type="submit"
          disabled={sending}
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-orange px-5 text-[14px] font-bold text-white shadow-orange disabled:opacity-50"
        >
          {t("invite.nameSubmit")}
        </button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13.5px] text-ink-2">{t("invite.lead")}</p>
      <BigLink href={invite?.waUrl ?? null} icon={<WhatsAppLogo />} label={t("invite.whatsapp")} onUse={onSent} />
      <BigLink href={invite?.mailtoUrl ?? null} icon={<ForwardMailLogo />} label={t("invite.email")} onUse={onSent} />
      <button
        type="button"
        disabled={!invite}
        onClick={async () => {
          if (!invite) return;
          try {
            await navigator.clipboard.writeText(invite.text);
            onCopied();
          } catch {
            window.prompt(t("invite.copy"), invite.link);
          }
        }}
        className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-lilac-2 px-5 text-[14px] font-bold text-ink transition-colors hover:bg-lilac disabled:opacity-50"
      >
        {t("invite.copy")}
      </button>
      {error ? <p className="text-[12.5px] text-orange-ink">{error}</p> : null}
      <button
        type="button"
        onClick={async () => {
          if (contacts) {
            const [c] = await contacts.select(["name", "tel", "email"], { multiple: false }).catch(() => []);
            if (!c) return;
            const phone = c.tel?.[0];
            setManual({
              channel: phone || !c.email?.[0] ? "phone" : "email",
              prefill: { name: c.name?.[0]?.split(" ")[0], phone, email: c.email?.[0] },
            });
          } else {
            setManual({ channel: "phone", prefill: {} });
          }
        }}
        className="self-center px-2 py-1 text-[12.5px] font-semibold text-muted underline-offset-4 hover:text-ink hover:underline"
      >
        {t("invite.manual")}
      </button>
    </div>
  );
}

export function AddPersonButton() {
  const { open, close } = usePanel();
  const router = useRouter();
  const toast = useToast();
  const t = useTranslations("circle");
  return (
    <>
      <button
        type="button"
        onClick={() =>
          open({
            key: "invite",
            title: t("add.title"),
            body: (
              <InviteBody
                onDone={(name) => {
                  close();
                  toast.show(t("add.added", { name }));
                  router.refresh();
                }}
                // On part vers WhatsApp ou l'email : au retour, la feuille est fermée.
                onSent={() => window.setTimeout(close, 400)}
                onCopied={() => {
                  close();
                  toast.show(t("invite.copied"));
                }}
              />
            ),
          })
        }
        className="flex w-full items-center gap-3.5 rounded-card border-[1.5px] border-line bg-paper-2 p-4 text-start transition hover:-translate-y-px hover:border-ink"
      >
        <span aria-hidden className="inline-flex size-[42px] shrink-0 items-center justify-center rounded-[14px] bg-lilac-2 text-[19px]">
          +
        </span>
        <span>
          <span className="block font-bold">{t("add.title")}</span>
          <span className="block text-[12.5px] text-muted">{t("add.hint")}</span>
        </span>
        <span aria-hidden className="ms-auto text-soft inline-block rtl:-scale-x-100">
          ›
        </span>
      </button>
      {toast.node}
    </>
  );
}
