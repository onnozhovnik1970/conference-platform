import { Resend } from "resend";

import type { CertificatePayload } from "@/lib/certificates/fetch-payloads";
import { getResendEnv } from "@/lib/email/resend-config";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildCertificateThankYouHtml(payload: CertificatePayload): string {
  const name = escapeHtml(payload.participantName);
  const title = escapeHtml(payload.abstractTitle);
  return `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;font-family:Georgia,'Times New Roman',serif;background:#0f172a;color:#0f172a;line-height:1.55;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 16px;background:linear-gradient(165deg,#0c1a33 0%,#152a4a 45%,#0f172a 100%);">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;border-radius:14px;overflow:hidden;border:2px solid #c9a227;box-shadow:0 12px 40px rgba(0,0,0,0.35);">
          <tr>
            <td style="background:#fdfbf7;padding:32px 28px 28px;">
              <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#1e3a5f;font-weight:600;">SUTE Conference</p>
              <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#0c1a33;line-height:1.25;">Дякуємо за участь!</h1>
              <p style="margin:0 0 22px;font-size:17px;font-weight:500;color:#334155;">Thank you for participating!</p>
              <div style="height:1px;background:linear-gradient(90deg,transparent,#c9a227,transparent);margin:0 0 22px;"></div>
              <section lang="uk" style="margin-bottom:22px;padding-bottom:20px;border-bottom:1px solid #e2e8f0;">
                <p style="margin:0;font-size:15px;color:#1e293b;">Шановний/а <strong>${name}</strong>,</p>
                <p style="margin:14px 0 0;font-size:15px;color:#334155;">У додатку — Ваш персональний <strong>сертифікат учасника</strong> конференції. Ми цінуємо Ваш внесок і бажаємо подальших наукових успіхів.</p>
                <p style="margin:12px 0 0;font-size:14px;color:#475569;"><strong>Назва тез:</strong> ${title}</p>
              </section>
              <section lang="en">
                <p style="margin:0;font-size:15px;color:#1e293b;">Dear <strong>${name}</strong>,</p>
                <p style="margin:14px 0 0;font-size:15px;color:#334155;">Please find your personal <strong>Certificate of Participation</strong> attached as a PDF. We appreciate your contribution and wish you continued success.</p>
                <p style="margin:12px 0 0;font-size:14px;color:#475569;"><strong>Abstract title:</strong> ${title}</p>
              </section>
              <p style="margin:26px 0 0;font-size:13px;color:#64748b;text-align:center;">З повагою, оргкомітет / With kind regards, the organizing committee</p>
            </td>
          </tr>
          <tr>
            <td style="background:#0c1a33;padding:14px 24px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#94a3b8;">Автоматичне повідомлення · Automated message</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendCertificateThankYouEmail(params: {
  to: string;
  payload: CertificatePayload;
  pdfBuffer: Buffer;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const env = getResendEnv();
  if (!env) {
    return { ok: false, error: "Resend is not configured (RESEND_API_KEY / RESEND_FROM_EMAIL)." };
  }

  const resend = new Resend(env.apiKey);
  const html = buildCertificateThankYouHtml(params.payload);
  const subject = "Сертифікат учасника / Certificate of participation";
  const filename = `certificate-${params.payload.submissionId}.pdf`;

  const { error } = await resend.emails.send({
    from: env.from,
    to: [params.to.trim()],
    subject,
    html,
    attachments: [
      {
        filename,
        content: params.pdfBuffer.toString("base64")
      }
    ]
  });

  if (error) {
    return { ok: false, error: error.message ?? "Resend error" };
  }
  return { ok: true };
}
