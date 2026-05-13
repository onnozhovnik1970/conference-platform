import { NextResponse } from "next/server";
import { Resend } from "resend";

import { assertAdminFromRequest, getServiceRoleClient } from "@/lib/admin-server";

const ALLOWED_STATUSES = [
  "pending",
  "pending_review",
  "under_review",
  "accepted",
  "rejected",
  "needs_revision"
] as const;

function isAllowedStatus(value: unknown): value is (typeof ALLOWED_STATUSES)[number] {
  return typeof value === "string" && (ALLOWED_STATUSES as readonly string[]).includes(value);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function statusBilingual(status: string): { uk: string; en: string } {
  const map: Record<string, { uk: string; en: string }> = {
    pending: { uk: "Очікує", en: "Pending" },
    pending_review: { uk: "На перевірці", en: "Pending review" },
    under_review: { uk: "На розгляді", en: "Under review" },
    accepted: { uk: "Прийнято", en: "Accepted" },
    rejected: { uk: "Відхилено", en: "Rejected" },
    needs_revision: { uk: "Потребує доопрацювання", en: "Needs revision" }
  };
  return map[status] ?? { uk: status, en: status };
}

function buildBilingualHtml(params: {
  participantName: string;
  abstractTitle: string;
  statusUk: string;
  statusEn: string;
  reviewerComment: string;
}): string {
  const { participantName, abstractTitle, statusUk, statusEn, reviewerComment } = params;
  const safeName = escapeHtml(participantName);
  const safeTitle = escapeHtml(abstractTitle);
  const safeComment = escapeHtml(reviewerComment);
  const commentUk = reviewerComment.trim()
    ? `<p style="margin:12px 0 0;"><strong>Коментар рецензента:</strong><br/>${safeComment.replace(/\n/g, "<br/>")}</p>`
    : `<p style="margin:12px 0 0;color:#64748b;font-size:14px;">Коментар рецензента відсутній.</p>`;
  const commentEn = reviewerComment.trim()
    ? `<p style="margin:12px 0 0;"><strong>Reviewer comment:</strong><br/>${safeComment.replace(/\n/g, "<br/>")}</p>`
    : `<p style="margin:12px 0 0;color:#64748b;font-size:14px;">No reviewer comment.</p>`;

  return `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:24px;font-family:Georgia,'Times New Roman',serif;background:#f8fafc;color:#0f172a;line-height:1.55;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px 24px;border:1px solid #e2e8f0;">
    <tr>
      <td>
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;">SUTE Conference</p>
        <h1 style="margin:0 0 20px;font-size:20px;font-weight:600;">Оновлення статусу тез<br/><span style="font-size:16px;font-weight:400;color:#475569;">Abstract status update</span></h1>

        <section lang="uk" style="margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid #e2e8f0;">
          <h2 style="margin:0 0 12px;font-size:16px;">Українською</h2>
          <p style="margin:0;"><strong>Учасник:</strong> ${safeName}</p>
          <p style="margin:8px 0 0;"><strong>Назва тез:</strong> ${safeTitle}</p>
          <p style="margin:8px 0 0;"><strong>Новий статус:</strong> ${escapeHtml(statusUk)}</p>
          ${commentUk}
        </section>

        <section lang="en">
          <h2 style="margin:0 0 12px;font-size:16px;">English</h2>
          <p style="margin:0;"><strong>Participant:</strong> ${safeName}</p>
          <p style="margin:8px 0 0;"><strong>Abstract title:</strong> ${safeTitle}</p>
          <p style="margin:8px 0 0;"><strong>New status:</strong> ${escapeHtml(statusEn)}</p>
          ${commentEn}
        </section>

        <p style="margin:24px 0 0;font-size:13px;color:#64748b;">Це автоматичне повідомлення. / This is an automated message.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(request: Request) {
  const auth = await assertAdminFromRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !fromEmail) {
    return NextResponse.json({ error: "Email is not configured (RESEND_API_KEY, RESEND_FROM_EMAIL)." }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const userId = typeof (body as { userId?: unknown }).userId === "string" ? (body as { userId: string }).userId.trim() : "";
  const participantName =
    typeof (body as { participantName?: unknown }).participantName === "string"
      ? (body as { participantName: string }).participantName.trim()
      : "";
  const abstractTitle =
    typeof (body as { abstractTitle?: unknown }).abstractTitle === "string"
      ? (body as { abstractTitle: string }).abstractTitle.trim()
      : "";
  const newStatus = (body as { newStatus?: unknown }).newStatus;
  const reviewerCommentRaw = (body as { reviewerComment?: unknown }).reviewerComment;
  const reviewerComment =
    reviewerCommentRaw === null || reviewerCommentRaw === undefined
      ? ""
      : typeof reviewerCommentRaw === "string"
        ? reviewerCommentRaw
        : "";

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }
  if (!participantName) {
    return NextResponse.json({ error: "Missing participantName" }, { status: 400 });
  }
  if (!abstractTitle) {
    return NextResponse.json({ error: "Missing abstractTitle" }, { status: 400 });
  }
  if (!isAllowedStatus(newStatus)) {
    return NextResponse.json({ error: "Invalid newStatus" }, { status: 400 });
  }

  const supabase = getServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
  if (userError || !userData?.user?.email?.trim()) {
    return NextResponse.json({ error: "Could not resolve participant email." }, { status: 400 });
  }

  const to = userData.user.email.trim();
  const { uk: statusUk, en: statusEn } = statusBilingual(newStatus);
  const html = buildBilingualHtml({
    participantName,
    abstractTitle,
    statusUk,
    statusEn,
    reviewerComment
  });

  const resend = new Resend(apiKey);
  const subject = `Оновлення статусу тез / Abstract status: ${statusEn}`;

  const { error: sendError } = await resend.emails.send({
    from: fromEmail,
    to: [to],
    subject,
    html
  });

  if (sendError) {
    return NextResponse.json({ error: sendError.message ?? "Resend error" }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
