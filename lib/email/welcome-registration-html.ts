import { escapeHtml } from "@/lib/email/escape-html";
import type { ConferenceEmailBundle } from "@/lib/email/conference-email-bundle";

export function buildWelcomeRegistrationHtml(params: { firstName: string; bundle: ConferenceEmailBundle }): string {
  const { firstName, bundle } = params;
  const name = escapeHtml(firstName.trim() || "Participant");
  const zoomSection = bundle.zoomLink
    ? `<div style="margin-top:18px;padding:14px;background:#f1f5f9;border-radius:8px;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:600;">Пленарне Zoom / Plenary Zoom</p>
        <p style="margin:0;"><a href="${escapeHtml(bundle.zoomLink)}" style="color:#0ea5e9;font-weight:600;">${escapeHtml(bundle.zoomLink)}</a></p>
      </div>`
    : `<p style="margin:16px 0 0;font-size:14px;color:#64748b;">Посилання Zoom буде в особистому кабінеті та на сайті. / The Zoom link will also appear on the website and in your dashboard.</p>`;

  return `<!DOCTYPE html>
<html lang="uk">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/></head>
<body style="margin:0;padding:24px;font-family:Georgia,'Times New Roman',serif;background:#f8fafc;color:#0f172a;line-height:1.55;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px 24px;border:1px solid #e2e8f0;">
    <tr><td>
      <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;">SUTE Conference</p>
      <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;">Ласкаво просимо! / Welcome!</h1>
      <p style="margin:0 0 20px;font-size:16px;">Вітаємо, <strong>${name}</strong>! / Dear <strong>${name}</strong>, welcome!</p>

      <section lang="uk" style="margin-bottom:22px;padding-bottom:18px;border-bottom:1px solid #e2e8f0;">
        <h2 style="margin:0 0 10px;font-size:15px;">Українською</h2>
        <p style="margin:0;"><strong>Конференція:</strong> ${escapeHtml(bundle.titleUa)}</p>
        <p style="margin:8px 0 0;"><strong>Дата:</strong> ${escapeHtml(bundle.dateLongUa)}</p>
        <p style="margin:8px 0 0;"><strong>Формат / місце:</strong> ${escapeHtml(bundle.locationDisplay)}</p>
        <p style="margin:12px 0 0;"><strong>Наступні кроки:</strong> подайте тези через кабінет (за потреби); у день конференції підключіться до Zoom.</p>
        <p style="margin:10px 0 0;font-size:14px;"><strong>Пленарне засідання:</strong> ${escapeHtml(bundle.plenaryWhenUa)}</p>
      </section>

      <section lang="en">
        <h2 style="margin:0 0 10px;font-size:15px;">English</h2>
        <p style="margin:0;"><strong>Conference:</strong> ${escapeHtml(bundle.titleEn)}</p>
        <p style="margin:8px 0 0;"><strong>Date:</strong> ${escapeHtml(bundle.dateLongEn)}</p>
        <p style="margin:8px 0 0;"><strong>Format / location:</strong> ${escapeHtml(bundle.locationDisplay)}</p>
        <p style="margin:12px 0 0;"><strong>Next steps:</strong> submit your abstract via the dashboard if needed; on the conference day, join via Zoom.</p>
        <p style="margin:10px 0 0;font-size:14px;"><strong>Plenary session:</strong> ${escapeHtml(bundle.plenaryWhenEn)}</p>
      </section>

      ${zoomSection}

      <p style="margin:22px 0 0;font-size:13px;color:#64748b;">Автоматичне повідомлення після реєстрації. / Automated message sent after registration.</p>
    </td></tr>
  </table>
</body>
</html>`;
}
