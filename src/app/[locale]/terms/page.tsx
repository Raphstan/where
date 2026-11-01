import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/legal/legal-page";
import { LEGAL } from "@/content/legal";
import { isLocale, routing } from "@/i18n/routing";

async function textsFor(params: PageProps<"/[locale]/terms">["params"]) {
  const { locale } = await params;
  return LEGAL[isLocale(locale) ? locale : routing.defaultLocale];
}

export async function generateMetadata(props: PageProps<"/[locale]/terms">): Promise<Metadata> {
  return { title: (await textsFor(props.params)).terms.metaTitle };
}

/* Conditions d'utilisation (texte : src/content/legal/{langue}.ts). */
export default async function TermsPage(props: PageProps<"/[locale]/terms">) {
  const { locale } = await props.params;
  if (isLocale(locale)) setRequestLocale(locale);
  const texts = await textsFor(props.params);
  return <LegalPage doc={texts.terms} updated={texts.updated} other={{ kind: "privacy", label: texts.privacy.title }} />;
}
