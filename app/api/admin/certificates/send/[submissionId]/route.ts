import { NextResponse } from "next/server";

import { assertAdminFromRequest, getServiceRoleClient } from "@/lib/admin-server";
import { loadCertificatePayloadBySubmissionId } from "@/lib/certificates/fetch-payloads";
import { renderCertificatePdfBuffer } from "@/lib/certificates/render-certificate-pdf";
import { sendCertificateThankYouEmail } from "@/lib/email/send-certificate-email";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(_request: Request, context: { params: Promise<{ submissionId: string }> | { submissionId: string } }) {
  const auth = await assertAdminFromRequest(_request);
  if (!auth.ok) {
    return auth.response;
  }

  const resolved = await Promise.resolve(context.params);
  const rawId = resolved.submissionId?.trim() ?? "";
  if (!UUID_RE.test(rawId)) {
    return NextResponse.json({ error: "Invalid submission id" }, { status: 400 });
  }

  const supabase = getServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  try {
    const payload = await loadCertificatePayloadBySubmissionId(supabase, rawId);
    if (!payload) {
      return NextResponse.json(
        { error: "Submission not found or not eligible (must be accepted and not archived)." },
        { status: 404 }
      );
    }

    const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(payload.userId);
    const to = userData?.user?.email?.trim();
    if (userErr || !to) {
      return NextResponse.json({ error: "Could not resolve participant email for this submission." }, { status: 400 });
    }

    const pdfBuffer = renderCertificatePdfBuffer(payload);
    const sent = await sendCertificateThankYouEmail({ to, payload, pdfBuffer });
    if (!sent.ok) {
      return NextResponse.json({ error: sent.error }, { status: 502 });
    }

    return NextResponse.json({ success: true, to });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Certificate email failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
