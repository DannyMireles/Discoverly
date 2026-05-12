import { Resend } from "resend";

function inviteUrl(token: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");
  return `${base.replace(/\/$/, "")}/invite/${token}`;
}

export type SendInviteInput = {
  toEmail: string;
  affiliateName: string;
  companyName: string;
  inviteToken: string;
};

export async function sendAffiliateInviteEmail(input: SendInviteInput) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set in Vercel env vars.");
  }

  const from = process.env.INVITE_EMAIL_FROM;
  if (!from) {
    throw new Error(
      "INVITE_EMAIL_FROM is not set in Vercel env vars. Set it to a sender address on your verified Resend domain (e.g. 'Discoverly <auth@yourdomain.com>').",
    );
  }

  const url = inviteUrl(input.inviteToken);
  const resend = new Resend(apiKey);

  const subject = `You're invited to join ${input.companyName} on Discoverly`;
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827;">
      <h1 style="font-size:22px;margin:0 0 16px;">You're invited, ${escapeHtml(input.affiliateName)}.</h1>
      <p style="font-size:15px;line-height:1.6;margin:0 0 20px;">
        ${escapeHtml(input.companyName)} added you as an affiliate on Discoverly. Accept your invite to claim your public discount code and start tracking bookings.
      </p>
      <p style="margin:24px 0;">
        <a href="${url}" style="display:inline-block;background:#1e40af;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:8px;font-size:15px;">Accept invite</a>
      </p>
      <p style="font-size:13px;color:#6b7280;margin:0 0 4px;">Or paste this link into your browser:</p>
      <p style="font-size:13px;color:#374151;word-break:break-all;margin:0 0 28px;">${url}</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
      <p style="font-size:12px;color:#9ca3af;margin:0;">If you weren't expecting this email, you can safely ignore it.</p>
    </div>
  `;
  const text = `You're invited, ${input.affiliateName}.

${input.companyName} added you as an affiliate on Discoverly. Accept your invite to claim your public discount code and start tracking bookings.

Accept invite: ${url}

If you weren't expecting this email, you can safely ignore it.`;

  const { data, error } = await resend.emails.send({
    from,
    to: input.toEmail,
    subject,
    html,
    text,
  });

  if (error) {
    const detail = "message" in error ? error.message : JSON.stringify(error);
    throw new Error(`Resend rejected the email: ${detail}`);
  }
  return { id: data?.id ?? null, url };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
