import { NextResponse } from "next/server";

import { assertAdminFromRequest, getServiceRoleClient } from "@/lib/admin-server";
import { loadCertificatePayloads } from "@/lib/certificates/fetch-payloads";
import { renderCertificatePdfBuffer } from "@/lib/certificates/render-certificate-pdf";
import { sendCertificateThankYouEmail } from "@/lib/email/send-certificate-email";

export const dynamic = "force-dynamic";

export async function POST(_request: Request) {
  const auth = await assertAdminFromRequest(_request);
  if (!auth.ok) {
    return auth.response;
  }

  const supabase = getServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  try {
    const payloads = await loadCertificatePayloads(supabase);
    if (payloads.length === 0) {
      return NextResponse.json({ error: "No accepted, non-archived submissions to send certificates for." }, { status: 400 });
    }

    let sent = 0;
    let skippedNoEmail = 0;
    const failed: { submissionId: string; error: string }[] = [];

    for (const payload of payloads) {
      const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(payload.userId);
      const to = userData?.user?.email?.trim();
      if (userErr || !to) {
        skippedNoEmail += 1;
        continue;
      }

      const pdfBuffer = renderCertificatePdfBuffer(payload);
      const result = await sendCertificateThankYouEmail({ to, payload, pdfBuffer });
      if (!result.ok) {
        failed.push({ submissionId: payload.submissionId, error: result.error });
      } else {
        sent += 1;
      }
    }

    return NextResponse.json({
      success: true,
      recipientCount: payloads.length,
      sent,
      skippedNoEmail,
      failedCount: failed.length,
      failed
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Bulk certificate email failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
