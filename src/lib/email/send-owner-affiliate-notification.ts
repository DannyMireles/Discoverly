import { Resend } from "resend";
import { getLodgifyPromotionsUrl } from "@/lib/url/app-url";

export type SendOwnerAffiliateNotificationInput = {
  toEmail: string;
  companyName: string;
  affiliateName: string;
  affiliateEmail: string;
  publicCode: string;
  lodgifyPromotionName: string;
};

export async function sendOwnerAffiliateNotification(
  input: SendOwnerAffiliateNotificationInput,
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set in Vercel env vars.");
  }

  const from = process.env.OWNER_NOTIFICATION_EMAIL_FROM ?? process.env.INVITE_EMAIL_FROM;
  if (!from) {
    throw new Error(
      "OWNER_NOTIFICATION_EMAIL_FROM or INVITE_EMAIL_FROM must be set to a verified Resend sender address.",
    );
  }

  const lodgifyUrl = getLodgifyPromotionsUrl();
  const escapedLodgifyUrl = escapeHtml(lodgifyUrl);
  const resend = new Resend(apiKey);
  const subject = `New affiliate joined ${input.companyName}`;
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111827;">
      <h1 style="font-size:22px;margin:0 0 16px;">A new affiliate joined ${escapeHtml(input.companyName)}.</h1>
      <p style="font-size:15px;line-height:1.6;margin:0 0 18px;">
        ${escapeHtml(input.affiliateName)} (${escapeHtml(input.affiliateEmail)}) joined through your public Discoverly affiliate link.
      </p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 18px;">
        Add the Lodgify promotion below so Discoverly can attribute paid bookings and commissions correctly.
      </p>
      <div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:20px 0;background:#f9fafb;">
        <p style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;margin:0 0 6px;">Customer code</p>
        <p style="font-size:18px;font-weight:700;margin:0 0 16px;word-break:break-all;">${escapeHtml(input.publicCode)}</p>
        <p style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;margin:0 0 6px;">Lodgify promotion name to add</p>
        <p style="font-size:16px;font-weight:700;margin:0;word-break:break-all;">${escapeHtml(input.lodgifyPromotionName)}</p>
      </div>
      <p style="margin:24px 0;">
        <a href="${escapedLodgifyUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:8px;font-size:15px;">Open Lodgify</a>
      </p>
      <p style="font-size:13px;color:#6b7280;line-height:1.5;margin:0;">
        The Lodgify promotion name needs to match exactly. The public code is what guests can use when booking.
      </p>
    </div>
  `;
  const text = `A new affiliate joined ${input.companyName}.

Affiliate: ${input.affiliateName} (${input.affiliateEmail})

Add this promotion in Lodgify so Discoverly can attribute paid bookings and commissions correctly.

Customer code: ${input.publicCode}
Lodgify promotion name to add: ${input.lodgifyPromotionName}

Open Lodgify: ${lodgifyUrl}

The Lodgify promotion name needs to match exactly.`;

  const { data, error } = await resend.emails.send({
    from,
    to: input.toEmail,
    subject,
    html,
    text,
  });

  if (error) {
    const detail = "message" in error ? error.message : JSON.stringify(error);
    throw new Error(`Resend rejected the owner notification: ${detail}`);
  }

  return { id: data?.id ?? null };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
