'use strict';
/* Sends transactional email via Cloudflare Email Service's REST API (this
   backend is a plain Node/Express app, not a Worker, so the send_email
   binding isn't available — the REST endpoint is the documented path for
   apps outside Workers). */

const FROM_EMAIL = process.env.PASSWORD_RESET_FROM_EMAIL || 'noreply@cetu.online';
const FROM_NAME  = 'CETU LMS';

function getConfig() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token     = process.env.CLOUDFLARE_EMAIL_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token) {
    throw new Error('Cloudflare Email Service is not configured (CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_EMAIL_API_TOKEN missing)');
  }
  return { accountId, token };
}

async function sendEmail({ to, subject, html, text }) {
  const { accountId, token } = getConfig();

  const resp = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/email/sending/send`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to,
      from: { address: FROM_EMAIL, name: FROM_NAME },
      subject,
      html,
      text,
    }),
  });

  const data = await resp.json().catch(() => null);
  if (!resp.ok || !data?.success) {
    const message = data?.errors?.[0]?.message || `Cloudflare Email Service returned ${resp.status}`;
    throw new Error(message);
  }
  return data.result;
}

async function sendPasswordResetEmail(user, resetUrl) {
  const name = `${user.first_name} ${user.last_name}`.trim() || user.email;

  const text = [
    `Hi ${name},`,
    '',
    'A password reset was requested for your CETU LMS account.',
    'If this was you, use the link below to set a new password. This link expires in 30 minutes and can only be used once.',
    '',
    resetUrl,
    '',
    "If you didn't request this, you can safely ignore this email — your password will not be changed.",
  ].join('\n');

  const html = `
    <p>Hi ${name},</p>
    <p>A password reset was requested for your CETU LMS account.</p>
    <p>If this was you, use the link below to set a new password. This link expires in 30 minutes and can only be used once.</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>If you didn't request this, you can safely ignore this email — your password will not be changed.</p>
  `.trim();

  return sendEmail({ to: user.email, subject: 'Reset your CETU LMS password', html, text });
}

module.exports = { sendPasswordResetEmail };
