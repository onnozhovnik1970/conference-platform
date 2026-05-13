import { escapeHtml } from "@/lib/email/escape-html";
import type { ConferenceEmailBundle } from "@/lib/email/conference-email-bundle";

export type ReminderSectionInfo = {
  labelEn: string;
  labelUa: string;
  zoomLink: string | null;
  startsEn: string;
  startsUa: string;
};

export function buildConferenceReminderHtml(params: {
  participantName: string;
  bundle: ConferenceEmailBundle;
  section: ReminderSectionInfo | null;
}): string {
  const { participantName, bundle, section } = params;
  const name = escapeHtml(participantName.trim() || "Participant");

  const plenaryZoomUk = bundle.zoomLink
    ? `<p style="margin:10px 0 0;"><strong>Пленарне Zoom:</strong> <a href="${escapeHtml(bundle.zoomLink)}" style="color:#0ea5e9;">${escapeHtml(bundle.zoomLink)}</a></p>`
    : `<p style="margin:10px 0 0;color:#64748b;font-size:14px;">Посилання на пленарне засідання — на сайті. / Plenary link on the website.</p>`;

  const plenaryZoomEn = bundle.zoomLink
    ? `<p style="margin:10px 0 0;"><strong>Plenary Zoom:</strong> <a href="${escapeHtml(bundle.zoomLink)}" style="color:#0ea5e9;">${escapeHtml(bundle.zoomLink)}</a></p>`
    : `<p style="margin:10px 0 0;color:#64748b;font-size:14px;">See the conference website for the plenary link.</p>`;

  const sectionBlockUk = section
    ? `<p style="margin:12px 0 0;"><strong>Ваша секція:</strong> ${escapeHtml(section.labelUa)}</p>
     ${section.zoomLink ? `<p style="margin:8px 0 0;"><strong>Zoom секції:</strong> <a href="${escapeHtml(section.zoomLink)}" style="color:#0ea5e9;">${escapeHtml(section.zoomLink)}</a></p>` : `<p style="margin:8px 0 0;font-size:14px;color:#64748b;">Посилання секції — на сайті конференції.</p>`}
     ${section.startsUa ? `<p style="margin:8px 0 0;font-size:14px;"><strong>Початок секції:</strong> ${escapeHtml(section.startsUa)}</p>` : ""}`
    : `<p style="margin:12px 0 0;font-size:14px;color:#64748b;">Деталі секції — у кабінеті або на сайті.</p>`;

  const sectionBlockEn = section
    ? `<p style="margin:12px 0 0;"><strong>Your section:</strong> ${escapeHtml(section.labelEn)}</p>
     ${section.zoomLink ? `<p style="margin:8px 0 0;"><strong>Section Zoom:</strong> <a href="${escapeHtml(section.zoomLink)}" style="color:#0ea5e9;">${escapeHtml(section.zoomLink)}</a></p>` : `<p style="margin:8px 0 0;font-size:14px;color:#64748b;">Section link on the conference website.</p>`}
     ${section.startsEn ? `<p style="margin:8px 0 0;font-size:14px;"><strong>Section starts:</strong> ${escapeHtml(section.startsEn)}</p>` : ""}`
    : `<p style="margin:12px 0 0;font-size:14px;color:#64748b;">See your dashboard or the website for section details.</p>`;

  return `<!DOCTYPE html>
<html lang="uk">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/></head>
<body style="margin:0;padding:24px;font-family:Georgia,'Times New Roman',serif;background:#f8fafc;color:#0f172a;line-height:1.55;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px 24px;border:1px solid #e2e8f0;">
    <tr><td>
      <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;">SUTE Conference</p>
      <h1 style="margin:0 0 14px;font-size:20px;font-weight:600;">Конференція завтра! / Conference tomorrow!</h1>
      <p style="margin:0 0 18px;font-size:16px;">Шановний/а <strong>${name}</strong> / Dear <strong>${name}</strong>,</p>

      <section lang="uk" style="margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #e2e8f0;">
        <p style="margin:0;">Нагадуємо: завтра — <strong>${escapeHtml(bundle.titleUa)}</strong>.</p>
        <p style="margin:10px 0 0;"><strong>Дата:</strong> ${escapeHtml(bundle.dateLongUa)}</p>
        <p style="margin:8px 0 0;"><strong>Пленарне засідання:</strong> ${escapeHtml(bundle.plenaryWhenUa)}</p>
        ${plenaryZoomUk}
        ${sectionBlockUk}
        <p style="margin:14px 0 0;font-size:14px;color:#475569;"><strong>Програма:</strong> актуальний розклад на сайті конференції; можливі зміни від організаторів.</p>
      </section>

      <section lang="en">
        <p style="margin:0;">Reminder: tomorrow — <strong>${escapeHtml(bundle.titleEn)}</strong>.</p>
        <p style="margin:10px 0 0;"><strong>Date:</strong> ${escapeHtml(bundle.dateLongEn)}</p>
        <p style="margin:8px 0 0;"><strong>Plenary session:</strong> ${escapeHtml(bundle.plenaryWhenEn)}</p>
        ${plenaryZoomEn}
        ${sectionBlockEn}
        <p style="margin:14px 0 0;font-size:14px;color:#475569;"><strong>Program:</strong> full schedule on the conference website; organizers may post updates.</p>
      </section>

      <p style="margin:20px 0 0;font-size:13px;color:#64748b;">Автоматичне повідомлення. / Automated message.</p>
    </td></tr>
  </table>
</body>
</html>`;
}
