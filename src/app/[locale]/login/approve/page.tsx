import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { Wordmark } from "@/components/shell/wordmark";
import { isLiveApproveLink } from "@/lib/auth/login-request";
import { ApproveCard } from "./approve-card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("login.approve");
  return { title: t("metaTitle"), robots: { index: false } };
}

const paramsSchema = z.object({ r: z.string().uuid(), s: z.string().regex(/^[A-Za-z0-9_-]{43}$/) });

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

async function Approve({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const parsed = paramsSchema.safeParse(await searchParams);
  if (!parsed.success) return <ApproveCard id="" secret="" live={false} />;
  const { r, s } = parsed.data;
  const live = await isLiveApproveLink(r, s).catch(() => false);
  return <ApproveCard id={r} secret={s} live={live} />;
}

/* Arrivée du lien de l'email, souvent dans le navigateur de Gmail (src/lib/auth/login-request.ts). */
export default function ApprovePage(props: { searchParams: SearchParams }) {
  return (
    <div className="hero flex min-h-dvh flex-1 flex-col items-center justify-center px-[22px] py-10">
      <div className="flex w-full max-w-[420px] flex-col gap-[18px]">
        <Wordmark className="text-base" />
        <Suspense fallback={<div className="h-[160px] animate-pulse rounded-card border border-line bg-paper-2" />}>
          <Approve searchParams={props.searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
