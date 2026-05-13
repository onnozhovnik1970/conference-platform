import JSZip from "jszip";
import { NextResponse } from "next/server";

import { assertAdminFromRequest, getServiceRoleClient } from "@/lib/admin-server";
import { buildCertificateDocumentDefinition } from "@/lib/certificates/build-document";
import { loadCertificatePayloads } from "@/lib/certificates/fetch-payloads";
import { renderCertificatePdfBuffer } from "@/lib/certificates/render-pdf";

export const dynamic = "force-dynamic";

function pdfFileName(submissionId: string): string {
  return `certificate-${submissionId}.pdf`;
}

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
      return NextResponse.json({ error: "No accepted submissions to generate certificates for." }, { status: 400 });
    }

    const zip = new JSZip();
    for (const p of payloads) {
      const doc = buildCertificateDocumentDefinition(p);
      const buf = await renderCertificatePdfBuffer(doc);
      zip.file(pdfFileName(p.submissionId), buf);
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    const filename = "conference-certificates.zip";

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Certificate generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
