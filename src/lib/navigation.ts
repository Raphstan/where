export type NavKey = "chat" | "memory" | "circle" | "sources" | "privacy" | "edge" | "profile";

export type NavItem = {
  key: NavKey;
  href: `/${string}`;
  /** Libellé des onglets mobiles (docs/prototype.html, renderTabs) ; null : desktop seulement. */
  tabLabel: string | null;
  /** Libellé de la barre latérale desktop (docs/prototype.html, renderSide). */
  sideLabel: string;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { key: "chat", href: "/chat", tabLabel: "Chat", sideLabel: "Conversation" },
  { key: "memory", href: "/memory", tabLabel: "Mémoire", sideLabel: "Ma mémoire" },
  { key: "circle", href: "/circle", tabLabel: "Cercle", sideLabel: "Mon cercle" },
  // Sur mobile, le profil y mène (scrProfile).
  { key: "sources", href: "/sources", tabLabel: null, sideLabel: "Mes sources" },
  { key: "privacy", href: "/privacy", tabLabel: null, sideLabel: "Confidentialité" },
  { key: "edge", href: "/edge", tabLabel: null, sideLabel: "États limites" },
  { key: "profile", href: "/profile", tabLabel: "Profil", sideLabel: "Profil" },
] as const;

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
