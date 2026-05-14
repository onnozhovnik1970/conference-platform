import JSZip from "jszip";
import { NextResponse } from "next/server";

import { authorDisplayNameFromProfile, loadAcceptedSubmissionsForDocuments } from "@/lib/admin/accepted-submissions-for-documents";
import { fileExtensionFromPath, sanitizeExportFilenamePart } from "@/lib/admin/export-filename";
import { assertAdminFromRequest, getServiceRoleClient } from "@/lib/admin-server";

export const dynamic = "force-dynamic";

const ABSTRACTS_BUCKET = "abstracts";

export async function GET(request: Request) {
  const auth = await assertAdminFromRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  const supabase = getServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const loaded = await loadAcceptedSubmissionsForDocuments(supabase);
  if ("error" in loaded) {
    return NextResponse.json({ error: loaded.error }, { status: 500 });
  }

  const { submissions, profilesById } = loaded;
  const zip = new JSZip();
  const usedNames = new Set<string>();

  for (const sub of submissions) {
    const path = typeof sub.file_path === "string" ? sub.file_path.trim() : "";
    if (!path) {
      console.warn("[admin export theses-zip] skip — no file", { id: sub.id });
      continue;
    }

    const { data: blob, error } = await supabase.storage.from(ABSTRACTS_BUCKET).download(path);
    if (error || !blob) {
      console.warn("[admin export theses-zip] download failed", { id: sub.id, message: error?.message });
      continue;
    }

    const buf = Buffer.from(await blob.arrayBuffer());
    const prof = profilesById[sub.user_id];
    const authorPart = sanitizeExportFilenamePart(authorDisplayNameFromProfile(prof), 48);
    const titlePart = sanitizeExportFilenamePart((sub.abstract_title ?? "abstract").trim() || "abstract", 72);
    const ext = fileExtensionFromPath(path) || ".bin";
    const base = `${authorPart}_${titlePart}`;
    let entryName = `${base}${ext}`;
    let n = 2;
    while (usedNames.has(entryName)) {
      entryName = `${base}_${n}${ext}`;
      n += 1;
    }
    usedNames.add(entryName);
    zip.file(entryName, buf);
  }

  const nodeBuf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return new NextResponse(new Uint8Array(nodeBuf), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="conference-theses.zip"',
      "Cache-Control": "no-store"
    }
  });
}
