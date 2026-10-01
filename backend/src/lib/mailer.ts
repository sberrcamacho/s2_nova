import { env } from "../env.js";

export interface PasswordResetMail {
  to: string;
  name: string;
  link: string;
  token: string;
}

// Sends through Resend's HTTP API (no SDK dependency). Without an API key —
// local dev and tests — the message goes to the log so the flow is usable.
export async function sendPasswordResetMail(mail: PasswordResetMail): Promise<void> {
  const subject = "Recupera tu contraseña · Reset your password — S2 Nova";
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

  if (!env.RESEND_API_KEY) {
    if (env.NODE_ENV !== "test") console.log(`[mail] To: ${mail.to}\n${text}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.MAIL_FROM, to: [mail.to], subject, text }),
  });
  if (!response.ok) throw new Error(`Mail provider responded ${response.status}`);
}
