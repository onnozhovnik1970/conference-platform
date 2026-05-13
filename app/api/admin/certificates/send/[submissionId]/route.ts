import { NextResponse } from "next/server";

import { normalizeAdminSubmissionIdParam } from "@/lib/admin/submission-id-param";
import { assertAdminFromRequest, getServiceRoleClient } from "@/lib/admin-server";
import { loadCertificatePayloadBySubmissionId } from "@/lib/certificates/fetch-payloads";
import { renderCertificatePdfBuffer } from "@/lib/certificates/render-certificate-pdf";
import { sendCertificateThankYouEmail } from "@/lib/email/send-certificate-email";

export const dynamic = "force-dynamic";

function logCertSendError(stage: string, submissionId: string, e: unknown) {
  const err = e instanceof Error ? e : new Error(String(e));
  console.error("[admin cert POST send]", stage, { submissionId, message: err.message, stack: err.stack });
}

export async function POST(_request: Request, context: { params: Promise<{ submissionId: string }> | { submissionId: string } }) {
  const auth = await assertAdminFromRequest(_request);
  if (!auth.ok) {
    return auth.response;
  }

  const resolved = await Promise.resolve(context.params);
  const rawId = normalizeAdminSubmissionIdParam(resolved.submissionId);
  if (!rawId) {
    return NextResponse.json({ error: "Invalid submission id" }, { status: 400 });
  }

  const supabase = getServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const langParam = new URL(_request.url).searchParams.get("lang");

  let payload;
  try {
    payload = await loadCertificatePayloadBySubmissionId(supabase, rawId, { languageOverride: langParam });
  } catch (e) {
    logCertSendError("loadCertificatePayloadBySubmissionId", rawId, e);
    const detail = process.env.NODE_ENV === "development" && e instanceof Error ? e.message : undefined;
    return NextResponse.json({ error: "Failed to load certificate data", detail }, { status: 500 });
  }

  if (!payload) {
    return NextResponse.json(
      { error: "Submission not found or not eligible (must be accepted and not archived)." },
      { status: 404 }
    );
  }

  const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(payload.userId);
  const to = userData?.user?.email?.trim();
  if (userErr || !to) {
    console.error("[admin cert POST send] resolveEmail", {
      submissionId: rawId,
      userId: payload.userId,
      userErr: userErr?.message
    });
    return NextResponse.json({ error: "Could not resolve participant email for this submission." }, { status: 400 });
  }

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderCertificatePdfBuffer(payload);
  } catch (e) {
    logCertSendError("renderCertificatePdfBuffer", rawId, e);
    const detail = process.env.NODE_ENV === "development" && e instanceof Error ? e.message : undefined;
    return NextResponse.json({ error: "Certificate PDF generation failed", detail }, { status: 500 });
  }

  try {
    const sent = await sendCertificateThankYouEmail({ to, payload, pdfBuffer });
    if (!sent.ok) {
      return NextResponse.json({ error: sent.error }, { status: 502 });
    }
    return NextResponse.json({ success: true, to });
  } catch (e) {
    logCertSendError("sendCertificateThankYouEmail", rawId, e);
    const detail = process.env.NODE_ENV === "development" && e instanceof Error ? e.message : undefined;
    return NextResponse.json({ error: "Certificate email failed", detail }, { status: 500 });
  }
}
