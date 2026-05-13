import { NextResponse } from "next/server";

import { assertAdminFromRequest, getServiceRoleClient } from "@/lib/admin-server";
import { loadCertificatePayloadBySubmissionId } from "@/lib/certificates/fetch-payloads";
import { renderCertificatePdfBuffer } from "@/lib/certificates/render-certificate-pdf";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, context: { params: Promise<{ submissionId: string }> | { submissionId: string } }) {
  const auth = await assertAdminFromRequest(_request);
  if (!auth.ok) {
    return auth.response;
  }

  const resolved = await Promise.resolve(context.params);
  const id = resolved.submissionId?.trim() ?? "";
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid submission id" }, { status: 400 });
  }

  const supabase = getServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  try {
    const langParam = new URL(_request.url).searchParams.get("lang");
    const payload = await loadCertificatePayloadBySubmissionId(supabase, id, { languageOverride: langParam });
    if (!payload) {
      return NextResponse.json(
        { error: "Submission not found or not eligible (must be accepted and not archived)." },
        { status: 404 }
      );
    }

    const buf = await renderCertificatePdfBuffer(payload);
    const filename = `certificate-${payload.submissionId}.pdf`;

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Certificate generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
