export type NavKey = "chat" | "memory" | "circle" | "profile";

export type NavItem = {
  key: NavKey;
  href: `/${string}`;
  /** Libellé des onglets mobiles (docs/prototype.html, renderTabs). */
  tabLabel: string;
  /** Libellé de la barre latérale desktop (docs/prototype.html, renderSide). */
  sideLabel: string;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { key: "chat", href: "/chat", tabLabel: "Chat", sideLabel: "Conversation" },
  { key: "memory", href: "/memory", tabLabel: "Mémoire", sideLabel: "Ma mémoire" },
  { key: "circle", href: "/circle", tabLabel: "Cercle", sideLabel: "Mon cercle" },
  { key: "profile", href: "/profile", tabLabel: "Profil", sideLabel: "Profil" },
] as const;

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
