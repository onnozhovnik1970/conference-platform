import JSZip from "jszip";
import { NextResponse } from "next/server";

import { authorDisplayNameFromProfile, loadAcceptedSubmissionsForDocuments } from "@/lib/admin/accepted-submissions-for-documents";
import { fileExtensionFromPath, sanitizeExportFilenamePart } from "@/lib/admin/export-filename";
import { submissionStorageObjectPath } from "@/lib/admin/submission-storage-path";
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

  const withPath = submissions.filter((s) => submissionStorageObjectPath(s).length > 0);
  console.log("[admin export theses-zip] accepted submissions", {
    statusFilter: "status ILIKE 'accepted' AND archived_at IS NULL",
    totalRows: submissions.length,
    rowsWithStoragePath: withPath.length,
    sampleStatuses: [...new Set(submissions.map((s) => (s.status ?? "").trim()).filter(Boolean))].slice(0, 12)
  });

  const zip = new JSZip();
  const usedNames = new Set<string>();
  let addedFiles = 0;

  for (const sub of submissions) {
    const path = submissionStorageObjectPath(sub);
    if (!path) {
      console.warn("[admin export theses-zip] skip — no file_path / resolvable file_url", { id: sub.id });
      continue;
    }

    const { data: blob, error } = await supabase.storage.from(ABSTRACTS_BUCKET).download(path);
    if (error || !blob) {
      console.warn("[admin export theses-zip] download failed", { id: sub.id, path, message: error?.message });
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
    addedFiles += 1;
  }

  console.log("[admin export theses-zip] zip result", { addedFiles });

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
