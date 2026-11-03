/** L'expéditeur des emails de connexion (domaine wh3re.com vérifié chez Resend). */
export const LOGIN_SENDER = "hello@wh3re.com";

/**
 * Boîte mail à ouvrir d'un geste, d'après le domaine de l'adresse. La recherche Gmail inclut les
 * indésirables (in:anywhere). Domaine inconnu : pas de bouton.
 */
export function mailbox(email: string): { name: string; href: string } | null {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (["gmail.com", "googlemail.com"].includes(domain)) {
    return {
      name: "Gmail",
      href: `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(`from:${LOGIN_SENDER} in:anywhere`)}`,
    };
  }
  if (/^(outlook|hotmail|live|msn)\./.test(domain)) return { name: "Outlook", href: "https://outlook.live.com/mail/0/" };
  if (/^(yahoo|ymail)\./.test(domain)) return { name: "Yahoo Mail", href: "https://mail.yahoo.com/" };
  if (["icloud.com", "me.com", "mac.com"].includes(domain)) return { name: "iCloud Mail", href: "https://www.icloud.com/mail" };
  if (["proton.me", "protonmail.com", "pm.me"].includes(domain)) return { name: "Proton Mail", href: "https://mail.proton.me/" };
  return null;
}
