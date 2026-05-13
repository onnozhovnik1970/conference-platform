import { NextResponse } from "next/server";

import { normalizeAdminSubmissionIdParam } from "@/lib/admin/submission-id-param";
import { assertAdminFromRequest, getServiceRoleClient } from "@/lib/admin-server";
import { loadCertificatePayloadBySubmissionId } from "@/lib/certificates/fetch-payloads";
import { renderCertificatePdfBuffer } from "@/lib/certificates/render-certificate-pdf";

export const dynamic = "force-dynamic";

function logCertGetError(stage: string, submissionId: string, e: unknown) {
  const err = e instanceof Error ? e : new Error(String(e));
  console.error("[admin cert GET]", stage, { submissionId, message: err.message, stack: err.stack });
}

export async function GET(_request: Request, context: { params: Promise<{ submissionId: string }> | { submissionId: string } }) {
  const auth = await assertAdminFromRequest(_request);
  if (!auth.ok) {
    return auth.response;
  }

  const resolved = await Promise.resolve(context.params);
  const id = normalizeAdminSubmissionIdParam(resolved.submissionId);
  if (!id) {
    return NextResponse.json({ error: "Invalid submission id" }, { status: 400 });
  }

  const supabase = getServiceRoleClient();
  if (!supabase) {
    console.error("[admin cert GET] misconfigured", { submissionId: id });
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const langParam = new URL(_request.url).searchParams.get("lang");

  let payload;
  try {
    payload = await loadCertificatePayloadBySubmissionId(supabase, id, { languageOverride: langParam });
  } catch (e) {
    logCertGetError("loadCertificatePayloadBySubmissionId", id, e);
    const detail = process.env.NODE_ENV === "development" && e instanceof Error ? e.message : undefined;
    return NextResponse.json({ error: "Failed to load certificate data", detail }, { status: 500 });
  }

  if (!payload) {
    return NextResponse.json(
      { error: "Submission not found or not eligible (must be accepted and not archived)." },
      { status: 404 }
    );
  }

  let buf: Buffer;
  try {
    buf = await renderCertificatePdfBuffer(payload);
  } catch (e) {
    logCertGetError("renderCertificatePdfBuffer", id, e);
    const detail = process.env.NODE_ENV === "development" && e instanceof Error ? e.message : undefined;
    return NextResponse.json({ error: "Certificate PDF generation failed", detail }, { status: 500 });
  }

  const filename = `certificate-${payload.submissionId}.pdf`;

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store"
    }
  });
}
