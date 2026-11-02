"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { MenuIcon, NewQuestionIcon } from "./icons";
import { Wordmark } from "./wordmark";

/**
 * Barre du haut sur mobile, comme ChatGPT, Claude ou Happenstance : le menu ouvre la barre latérale
 * en tiroir (même contenu que sur desktop), le crayon démarre une nouvelle question.
 */
export function MobileTopBar({ sidebar }: { sidebar: ReactNode }) {
  // Le chemin n'est connu qu'à la requête (routes dynamiques) : rendu d'abord sans, sous <Suspense>.
  return (
    <Suspense fallback={<TopBarView sidebar={sidebar} pathname={null} />}>
      <ActiveTopBar sidebar={sidebar} />
    </Suspense>
  );
}

function ActiveTopBar({ sidebar }: { sidebar: ReactNode }) {
  return <TopBarView sidebar={sidebar} pathname={usePathname()} />;
}

function TopBarView({ sidebar, pathname }: { sidebar: ReactNode; pathname: string | null }) {
  const t = useTranslations("shell");
  const [open, setOpen] = useState(false);
  const [openedOn, setOpenedOn] = useState(pathname);

  // Le tiroir se referme dès qu'on change de page.
  if (open && openedOn !== pathname) {
    setOpen(false);
    setOpenedOn(pathname);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="flex shrink-0 items-center justify-between px-3 pt-[max(10px,env(safe-area-inset-top))] pb-2 lg:hidden">
        <button
          type="button"
          aria-label={t("menu")}
          aria-expanded={open}
          onClick={() => {
            setOpenedOn(pathname);
            setOpen(true);
          }}
          className="inline-flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-lilac-2"
        >
          <MenuIcon className="size-[22px]" />
        </button>
        <Wordmark />
        <Link
          href="/chat"
          aria-label={t("newQuestion")}
          className="inline-flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-lilac-2"
        >
          <NewQuestionIcon className="size-[21px]" />
        </Link>
      </header>

      <div
        className={`fixed inset-0 z-50 lg:hidden ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          aria-label={t("closeMenu")}
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-ink/40 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("menu")}
          inert={!open}
          className={`absolute inset-y-0 start-0 flex w-[84%] max-w-[310px] flex-col bg-paper px-3 pt-[max(16px,env(safe-area-inset-top))] pb-[max(14px,env(safe-area-inset-bottom))] shadow-soft transition-transform duration-200 ease-out motion-reduce:transition-none ${
            open ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"
          }`}
        >
          {sidebar}
        </div>
      </div>
    </>
  );
}
