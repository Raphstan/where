import type { Locale } from "@/i18n/routing";
import type { T } from "@/i18n/translator";

const FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif";

const escape = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Email de connexion envoyé par WH3RE (Resend), repris de supabase/templates/magic_link.html :
 * le bouton approuve la demande, le code sert sur un autre appareil. `t` : espace « login ».
 */
export function loginEmailHtml({ locale, code, url, t }: { locale: Locale; code: string; url: string; t: T }): string {
  const rtl = locale === "he";
  const dir = rtl ? ' dir="rtl"' : "";
  const align = rtl ? "right" : "left";
  return `<!doctype html><html lang="${locale}"${dir}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>WH3RE</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:${FONT};color:#2A1438">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff"><tr><td align="center" style="padding:24px 12px 32px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:500px"${dir}>
<tr><td style="padding:0 8px 16px"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td><img src="https://wh3re.com/mail/mascot.png" width="30" height="35" alt="" style="display:block;border:0"></td>
<td style="padding:0 8px;font:800 22px/1 ${FONT};letter-spacing:-.01em;color:#2A1438">WH3RE</td></tr></table></td></tr>
<tr><td style="background:#F7F4FB;border-radius:24px;padding:30px 26px;text-align:${align}">
<div style="font:800 30px/1.1 ${FONT};letter-spacing:-.02em;color:#2A1438">${escape(t("email.title"))}</div>
<div style="font:16px/1.5 ${FONT};color:#5E4B6E;margin-top:12px">${escape(t("email.lead"))}</div>
<a href="${escape(url)}" style="display:inline-block;margin-top:22px;background:#FF5A1F;color:#ffffff;text-decoration:none;font:700 15px/1 ${FONT};padding:14px 24px;border-radius:999px">${escape(t("email.button"))}</a>
<div style="font:13px/1.5 ${FONT};color:#7E6E90;margin-top:26px">${escape(t("email.codeLabel"))}</div>
<div style="font:800 30px/1 ${FONT};letter-spacing:.18em;color:#2A1438;margin-top:6px" dir="ltr">${escape(code)}</div>
<div style="font:13px/1.5 ${FONT};color:#7E6E90;margin-top:16px">${escape(t("email.expiry"))}</div>
</td></tr>
<tr><td align="center" style="padding:22px 16px 0;font:12px/1.6 ${FONT};color:#7E6E90">
${escape(t("email.ignore"))}<br>
<a href="mailto:privacy@wh3re.com" style="color:#7E6E90">privacy@wh3re.com</a>
</td></tr>
</table></td></tr></table></body></html>`;
}
