import { escapeHtml } from "@/lib/email/escape-html";
import type { ConferenceEmailBundle } from "@/lib/email/conference-email-bundle";

export type ProgramSectionRow = {
  labelUa: string;
  labelEn: string;
  startsUa: string;
  startsEn: string;
  zoomLink: string | null;
};

function zoomLinkCell(link: string | null): string {
  const trimmed = link?.trim();
  if (!trimmed) {
    return `<span style="color:#64748b;">—</span>`;
  }
  const safe = escapeHtml(trimmed);
  return `<a href="${safe}" style="color:#0ea5e9;font-weight:600;">${safe}</a>`;
}

function scheduleTableUa(params: {
  plenaryWhen: string;
  plenaryZoom: string | null;
  sections: ProgramSectionRow[];
}): string {
  const plenaryRow = `<tr style="background:#f1f5f9;">
    <td style="padding:10px 12px;border:1px solid #e2e8f0;font-weight:600;">Пленарне засідання</td>
    <td style="padding:10px 12px;border:1px solid #e2e8f0;">${escapeHtml(params.plenaryWhen)}</td>
    <td style="padding:10px 12px;border:1px solid #e2e8f0;">${zoomLinkCell(params.plenaryZoom)}</td>
  </tr>`;
  const bodyRows = params.sections
    .map(
      (s) => `<tr>
    <td style="padding:10px 12px;border:1px solid #e2e8f0;">${escapeHtml(s.labelUa)}</td>
    <td style="padding:10px 12px;border:1px solid #e2e8f0;">${escapeHtml(s.startsUa || "—")}</td>
    <td style="padding:10px 12px;border:1px solid #e2e8f0;">${zoomLinkCell(s.zoomLink)}</td>
  </tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:12px;font-size:14px;">
  <thead>
    <tr style="background:#0f172a;color:#f8fafc;">
      <th align="left" style="padding:10px 12px;border:1px solid #0f172a;">Секція</th>
      <th align="left" style="padding:10px 12px;border:1px solid #0f172a;">Час (Київ)</th>
      <th align="left" style="padding:10px 12px;border:1px solid #0f172a;">Zoom</th>
    </tr>
  </thead>
  <tbody>${plenaryRow}${bodyRows}</tbody>
</table>`;
}

function scheduleTableEn(params: {
  plenaryWhen: string;
  plenaryZoom: string | null;
  sections: ProgramSectionRow[];
}): string {
  const plenaryRow = `<tr style="background:#f1f5f9;">
    <td style="padding:10px 12px;border:1px solid #e2e8f0;font-weight:600;">Plenary session</td>
    <td style="padding:10px 12px;border:1px solid #e2e8f0;">${escapeHtml(params.plenaryWhen)}</td>
    <td style="padding:10px 12px;border:1px solid #e2e8f0;">${zoomLinkCell(params.plenaryZoom)}</td>
  </tr>`;
  const bodyRows = params.sections
    .map(
      (s) => `<tr>
    <td style="padding:10px 12px;border:1px solid #e2e8f0;">${escapeHtml(s.labelEn)}</td>
    <td style="padding:10px 12px;border:1px solid #e2e8f0;">${escapeHtml(s.startsEn || "—")}</td>
    <td style="padding:10px 12px;border:1px solid #e2e8f0;">${zoomLinkCell(s.zoomLink)}</td>
  </tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:12px;font-size:14px;">
  <thead>
    <tr style="background:#0f172a;color:#f8fafc;">
      <th align="left" style="padding:10px 12px;border:1px solid #0f172a;">Section</th>
      <th align="left" style="padding:10px 12px;border:1px solid #0f172a;">Time (Kyiv)</th>
      <th align="left" style="padding:10px 12px;border:1px solid #0f172a;">Zoom</th>
    </tr>
  </thead>
  <tbody>${plenaryRow}${bodyRows}</tbody>
</table>`;
}

export function buildConferenceProgramHtml(params: {
  participantName: string;
  bundle: ConferenceEmailBundle;
  sections: ProgramSectionRow[];
}): string {
  const { participantName, bundle, sections } = params;
  const name = escapeHtml(participantName.trim() || "Participant");

  const tableUa = scheduleTableUa({
    plenaryWhen: bundle.plenaryWhenUa,
    plenaryZoom: bundle.zoomLink,
    sections
  });
  const tableEn = scheduleTableEn({
    plenaryWhen: bundle.plenaryWhenEn,
    plenaryZoom: bundle.zoomLink,
    sections
  });

  return `<!DOCTYPE html>
<html lang="uk">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/></head>
<body style="margin:0;padding:24px;font-family:Georgia,'Times New Roman',serif;background:#f1f5f9;color:#0f172a;line-height:1.55;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:14px;border:1px solid #e2e8f0;">
    <tr><td style="padding:28px 24px 24px;">
      <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">SUTE Conference</p>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Програма конференції</h1>
      <p style="margin:0 0 22px;font-size:15px;font-weight:500;color:#475569;">Conference program</p>
      <p style="margin:0 0 18px;font-size:16px;">Вітаємо, <strong>${name}</strong>! / Hello <strong>${name}</strong>,</p>

      <section lang="uk" style="margin-bottom:26px;padding-bottom:22px;border-bottom:2px solid #e2e8f0;">
        <h2 style="margin:0 0 12px;font-size:17px;font-weight:600;">Українською</h2>
        <p style="margin:0;"><strong>Конференція:</strong> ${escapeHtml(bundle.titleUa)}</p>
        <p style="margin:8px 0 0;"><strong>Дата:</strong> ${escapeHtml(bundle.dateLongUa)}</p>
        <p style="margin:8px 0 0;"><strong>Місце / формат:</strong> ${escapeHtml(bundle.locationDisplay)}</p>
        <p style="margin:14px 0 0;font-size:14px;color:#475569;">Розклад нижче включає пленарне засідання та всі тематичні секції.</p>
        ${tableUa}
      </section>

      <section lang="en">
        <h2 style="margin:0 0 12px;font-size:17px;font-weight:600;">English</h2>
        <p style="margin:0;"><strong>Conference:</strong> ${escapeHtml(bundle.titleEn)}</p>
        <p style="margin:8px 0 0;"><strong>Date:</strong> ${escapeHtml(bundle.dateLongEn)}</p>
        <p style="margin:8px 0 0;"><strong>Location / format:</strong> ${escapeHtml(bundle.locationDisplay)}</p>
        <p style="margin:14px 0 0;font-size:14px;color:#475569;">The schedule below lists the plenary session and all thematic sections.</p>
        ${tableEn}
      </section>

      <p style="margin:24px 0 0;font-size:12px;color:#64748b;">Актуальні зміни — на сайті конференції. / For updates, see the conference website.</p>
      <p style="margin:8px 0 0;font-size:12px;color:#64748b;">Автоматичне повідомлення. / Automated message.</p>
    </td></tr>
  </table>
</body>
</html>`;
}
