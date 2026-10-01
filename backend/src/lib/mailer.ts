import { env } from "../env.js";

export interface PasswordResetMail {
  to: string;
  name: string;
  link: string;
  token: string;
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// The brand mark is served by the Web client (web/public/email/logo-mark.png,
// an unmodified copy of the light logo). Mail clients load it over HTTPS.
function logoUrl(): string {
  return `${env.WEB_APP_URL.replace(/\/$/, "")}/email/logo-mark.png`;
}

// Table layout with inline styles: the only thing every mail client renders
// the same. Brand violet #6622D6 (white text on it: 7.6:1), body #111118 on white.
export function renderPasswordResetEmail(mail: PasswordResetMail): { subject: string; html: string; text: string } {
  const subject = "Recupera tu contraseña · Reset your password — S2 Nova";
  const name = escapeHtml(mail.name);
  const link = escapeHtml(mail.link);
  const token = escapeHtml(mail.token);

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f3f8;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Crea una contraseña nueva. El enlace vale 30 minutos. · Create a new password. The link is valid for 30 minutes.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3f8;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e3e1ec;">
<tr><td style="padding:28px 28px 8px 28px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="padding-right:12px;"><img src="${logoUrl()}" width="44" height="44" alt="S2 Nova" style="display:block;border:0;border-radius:12px;"></td>
<td style="font-size:18px;font-weight:700;color:#111118;">S2 Nova<br><span style="font-size:12px;font-weight:600;letter-spacing:.04em;color:#5b5a6b;">PERSONAL FINANCE</span></td>
</tr></table>
</td></tr>
<tr><td style="padding:16px 28px 0 28px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111118;">
<h1 style="margin:0 0 8px 0;font-size:22px;line-height:28px;font-weight:700;">Recupera tu contraseña</h1>
<p style="margin:0 0 20px 0;font-size:15px;line-height:22px;color:#33323f;">Hola ${name}, usa el botón para crear una contraseña nueva. El enlace vale 30 minutos y solo se puede usar una vez.</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#6622D6" style="border-radius:12px;">
<a href="${link}" style="display:inline-block;padding:14px 24px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">Crear contraseña nueva</a>
</td></tr></table>
<p style="margin:20px 0 6px 0;font-size:13px;line-height:19px;color:#5b5a6b;">Si el botón no funciona, copia este enlace en tu navegador:</p>
<p style="margin:0 0 20px 0;font-size:13px;line-height:19px;word-break:break-all;"><a href="${link}" style="color:#5712C2;">${link}</a></p>
<p style="margin:0 0 6px 0;font-size:13px;line-height:19px;color:#5b5a6b;">¿Lo haces desde la app Android? Pega este código:</p>
<p style="margin:0 0 24px 0;padding:12px 14px;background:#f4f3f8;border-radius:10px;font-family:'SFMono-Regular',Consolas,Menlo,monospace;font-size:13px;line-height:19px;color:#111118;word-break:break-all;">${token}</p>
<hr style="border:0;border-top:1px solid #e3e1ec;margin:0 0 16px 0;">
<p style="margin:0 0 8px 0;font-size:13px;line-height:19px;color:#5b5a6b;">Si no lo pediste, ignora este mensaje: tu contraseña no cambia.</p>
<p style="margin:0 0 28px 0;font-size:13px;line-height:19px;color:#5b5a6b;"><strong style="color:#33323f;">English:</strong> use the button above to create a new password (valid 30 minutes, single use), or paste the code in the Android app. If you didn't ask for this, ignore this message.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    `Hola ${mail.name},`,
    "",
    "Para crear una contraseña nueva abre este enlace (vale 30 minutos):",
    mail.link,
    "",
    `Si lo haces desde la app Android, usa este código: ${mail.token}`,
    "",
    "Si no lo pediste, ignora este mensaje.",
    "",
    `Hi ${mail.name}, open the link above (valid 30 minutes) or use the code in the Android app. If you didn't ask for this, ignore this message.`,
  ].join("\n");

  return { subject, html, text };
}

// Sends through Resend's HTTP API (no SDK dependency). Without an API key —
// local dev and tests — the message goes to the log so the flow is usable.
export async function sendPasswordResetMail(mail: PasswordResetMail): Promise<void> {
  const { subject, html, text } = renderPasswordResetEmail(mail);

  if (!env.RESEND_API_KEY) {
    if (env.NODE_ENV !== "test") console.log(`[mail] To: ${mail.to}\n${text}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.MAIL_FROM, to: [mail.to], subject, html, text }),
  });
  if (!response.ok) throw new Error(`Mail provider responded ${response.status}`);
}
