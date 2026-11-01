"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

/** Événement Chrome / Android qui permet de proposer l'installation (absent des types DOM). */
type InstallPromptEvent = Event & { prompt: () => Promise<void> };

const DISMISS_KEY = "wh3re-install-dismissed";

type Mode = "hidden" | "ios" | "prompt";

function isInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Propose d'ajouter WH3RE à l'écran d'accueil, sur téléphone seulement et tant que l'appli n'est pas
 * installée. iPhone : explique le geste (Safari n'a pas de bouton d'installation). Android : bouton
 * « Installer » qui ouvre la fenêtre du système. « Plus tard » la masque sur cet appareil.
 */
export function InstallBanner() {
  const t = useTranslations("shell.install");
  const [mode, setMode] = useState<Mode>("hidden");
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    if (isInstalled() || wasDismissed()) return;
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const timer = ios ? window.setTimeout(() => setMode("ios"), 0) : undefined;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as InstallPromptEvent);
      setMode("prompt");
    };
    const onInstalled = () => setMode("hidden");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (mode === "hidden") return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setMode("hidden");
  };

  return (
    <div className="mx-[18px] mb-2 flex flex-col gap-3 rounded-card bg-paper-2 px-4 py-3.5 shadow-soft lg:hidden">
      <div className="flex flex-col gap-1">
        <div className="text-[15px] font-bold">{t("title")}</div>
        <p className="text-[13.5px] leading-normal text-ink-2">{mode === "ios" ? t("ios") : t("android")}</p>
      </div>
      <div className="flex items-center gap-2">
        {mode === "prompt" && promptEvent && (
          <button
            type="button"
            onClick={async () => {
              await promptEvent.prompt();
              setPromptEvent(null);
              setMode("hidden");
            }}
            className="inline-flex min-h-10 items-center rounded-full bg-orange px-5 text-[14px] font-bold text-white"
          >
            {t("install")}
          </button>
        )}
        <button type="button" onClick={dismiss} className="inline-flex min-h-10 items-center px-3 text-[14px] font-semibold text-ink-2">
          {t("dismiss")}
        </button>
      </div>
    </div>
  );
}
