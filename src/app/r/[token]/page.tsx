import type { Metadata } from "next";
import { Suspense } from "react";
import { loadInvitation } from "@/lib/network/guest";
import { GuestForm } from "./guest-form";

export const metadata: Metadata = {
  title: "Une question pour toi",
  // Lien privé : jamais indexé, jamais transmis en referer.
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

async function Invitation({ token }: { token: string }) {
  const invitation = await loadInvitation(token);
  if (!invitation) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[21px] font-medium leading-tight">Ce lien privé n’est plus valide.</h1>
        <p className="text-[12.5px] text-muted">Demande à la personne qui te l’a envoyé de t’en renvoyer un.</p>
      </div>
    );
  }
  const requester = invitation.requesterName ?? "la personne qui te demande";
  return (
    <>
      <h1 className="font-display text-[21px] font-medium leading-tight">{invitation.message}</h1>
      <GuestForm token={token} memberName={invitation.memberName} requester={requester} />
    </>
  );
}

/** Page invité : le proche répond depuis son lien privé, sans compte, sans appli (docs/prototype.html, scrSarah). */
export default function GuestPage({ params }: PageProps<"/r/[token]">) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-[#efe7d8]">
      <main className="mx-auto mt-auto flex w-full max-w-[480px] flex-col gap-3.5 rounded-t-[24px] bg-cream px-5 pt-5 pb-[30px] sm:my-auto sm:rounded-[24px] sm:shadow-soft">
        <div className="flex items-center">
          <span className="font-display tracking-[0.14em]">WHERE</span>
          <span className="ml-auto text-[11.5px] text-soft">Sans compte · sans appli</span>
        </div>
        <Suspense fallback={<div className="h-[420px] animate-pulse rounded-card bg-cream-2" />}>
          {params.then(({ token }) => (
            <Invitation token={token} />
          ))}
        </Suspense>
      </main>
    </div>
  );
}
