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

  const withPath = submissions.filter((s) => submissionStorageObjectPath(s as Record<string, unknown>).length > 0);
  console.log("[admin export theses-zip] accepted submissions", {
    statusFilter: "status ILIKE 'accepted' AND archived_at IS NULL",
    totalRows: submissions.length,
    rowsWithStoragePath: withPath.length,
    sampleStatuses: [
      ...new Set(
        submissions.map((s) => (typeof s.status === "string" ? s.status : "").trim()).filter(Boolean)
      )
    ].slice(0, 12),
    sampleFileFields: submissions.slice(0, 8).map((s) => {
      const row = s as Record<string, unknown>;
      const pathLike = Object.entries(row)
        .filter(
          ([k, v]) =>
            typeof v === "string" &&
            (v as string).trim().length > 0 &&
            /path|url|file|storage|upload|attachment|object|pdf|media/i.test(k)
        )
        .map(([k, v]) => [k, (v as string).length > 220 ? `${(v as string).slice(0, 220)}…` : v]);
      return {
        id: s.id,
        file_path: row.file_path ?? null,
        file_url: row.file_url ?? null,
        resolvedKey: submissionStorageObjectPath(row) || null,
        pathLikeStringColumns: Object.fromEntries(pathLike.slice(0, 12))
      };
    })
  });

  const zip = new JSZip();
  const usedNames = new Set<string>();
  let addedFiles = 0;

  for (const sub of submissions) {
    const row = sub as Record<string, unknown>;
    const path = submissionStorageObjectPath(row);
    if (!path) {
      const pathLike = Object.entries(row)
        .filter(
          ([k, v]) =>
            typeof v === "string" &&
            (v as string).trim().length > 0 &&
            /path|url|file|storage|upload|attachment|object|pdf|media/i.test(k)
        )
        .reduce<Record<string, string | null>>((acc, [k, v]) => {
          acc[k] = typeof v === "string" ? v : null;
          return acc;
        }, {});
      console.warn("[admin export theses-zip] skip — no resolvable storage key", {
        id: sub.id,
        user_id: sub.user_id,
        file_path: row.file_path ?? null,
        file_url: row.file_url ?? null,
        pathLikeStringColumns: pathLike
      });
      continue;
    }

    const { data: blob, error } = await supabase.storage.from(ABSTRACTS_BUCKET).download(path);
    if (error || !blob) {
      console.warn("[admin export theses-zip] download failed", { id: sub.id, path, message: error?.message });
      continue;
    }

    const buf = Buffer.from(await blob.arrayBuffer());
    const prof = profilesById[String(sub.user_id)];
    const authorPart = sanitizeExportFilenamePart(authorDisplayNameFromProfile(prof), 48);
    const rawTitle = typeof row.abstract_title === "string" ? row.abstract_title : "";
    const titlePart = sanitizeExportFilenamePart(rawTitle.trim() || "abstract", 72);
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
