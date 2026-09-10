// ============================================================
// vPast — email delivery (Gmail SMTP via nodemailer) + a
// beautiful, responsive login email (inline styles only).
// Env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
// Without SMTP creds it falls back to logging the magic link
// (handy for local dev / serve.ps1).
// ============================================================

import nodemailer from "nodemailer";

let transport = null;

export function getTransport() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  if (transport) return transport;
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 465,
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls: { rejectUnauthorized: false },
  });
  return transport;
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---- inline SVG brand mark (no external images; email clients block them) ----
const LOGO = `
<svg width="34" height="34" viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg">
  <rect width="34" height="34" rx="9" fill="#ececec"/>
  <rect x="9" y="8" width="16" height="18" rx="3" fill="#0f0f0f"/>
  <rect x="12" y="12" width="10" height="2" rx="1" fill="#ececec"/>
  <rect x="12" y="16" width="10" height="2" rx="1" fill="#ececec"/>
  <rect x="12" y="20" width="6" height="2" rx="1" fill="#ececec"/>
  <circle cx="25" cy="25" r="4.5" fill="#9d4bff"/>
  <path d="M23 25 l1.6 1.6 L28 23.4" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

export function loginEmailHtml({ magicUrl, token, email, origin }) {
  const host = origin ? origin.replace(/^https?:\/\//, "") : "vPast";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0b0b0d;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0d;">
    <tr><td align="center" style="padding:36px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#141416;border:1px solid #26262b;border-radius:22px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.45);">
        <!-- header -->
        <tr><td style="padding:26px 28px;background:#1a1a1e;border-bottom:1px solid #26262b;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td>${LOGO}</td>
            <td style="padding-left:12px;">
              <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:19px;font-weight:800;color:#f5f5f7;letter-spacing:-.2px;">vPast</span>
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;color:#9a9aa2;margin-top:2px;">${esc(host)}</div>
            </td>
          </tr></table>
        </td></tr>
        <!-- body -->
        <tr><td style="padding:32px 30px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:24px;font-weight:800;color:#f5f5f7;letter-spacing:-.4px;line-height:1.2;">Your sign-in link</td></tr>
            <tr><td style="padding-top:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.6;color:#b8b8c0;">
              Tap the button below to sign in as <b style="color:#f5f5f7;">${esc(email)}</b>. The link expires in <b style="color:#f5f5f7;">15 minutes</b>.
            </td></tr>
            <!-- CTA -->
            <tr><td align="center" style="padding:28px 0 6px;">
              <a href="${esc(magicUrl)}" style="display:inline-block;padding:14px 30px;border-radius:999px;background:#ececec;color:#0b0b0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:800;text-decoration:none;letter-spacing:-.2px;">Sign in to vPast</a>
            </td></tr>
            <tr><td align="center" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;color:#9a9aa2;padding-top:6px;">or paste this code inside the app</td></tr>
            <!-- code banner -->
            <tr><td align="center" style="padding:20px 0 4px;">
              <div style="display:inline-block;max-width:100%;background:#1d1d22;border:1px dashed #3a3a44;border-radius:12px;padding:14px 18px;font-family:ui-monospace,'SF Mono',Consolas,'Cascadia Code',monospace;font-size:12.5px;color:#d8d8e0;word-break:break-all;line-height:1.5;">${esc(token)}</div>
            </td></tr>
            <tr><td style="padding-top:26px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;line-height:1.6;color:#6f6f78;">
              If you didn't request this, you can safely ignore this email — your account stays safe.
            </td></tr>
          </table>
        </td></tr>
        <!-- footer -->
        <tr><td style="padding:16px 28px;background:#101012;border-top:1px solid #26262b;">
          <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11px;color:#6f6f78;">vPast · paste it like it's meant to last</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendLoginEmail({ to, origin, magicUrl, token }) {
  const transport = getTransport();
  const html = loginEmailHtml({ magicUrl, token, email: to, origin });
  const text = `Your vPast sign-in link (expires in 15 min):\n${magicUrl}\n\nIf the button doesn't work, paste this code into vPast and press Continue:\n${token}`;
  if (!transport) {
    console.log(`\n[MAIL-DEV] Magic link for ${to} → ${magicUrl}\n`);
    return { dev: true, link: magicUrl };
  }
  await transport.sendMail({
    from: `"vPast" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject: `Sign in to vPast · ${new Date().toLocaleDateString("en-US", { day: "numeric", month: "short" })}`,
    html,
    text,
  });
  return { ok: true };
}