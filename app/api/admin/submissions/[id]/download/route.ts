import { NextResponse } from "next/server";

import { assertAdminFromRequest, getServiceRoleClient } from "@/lib/admin-server";

const ABSTRACTS_BUCKET = "abstracts";

function mimeForPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return "application/octet-stream";
}

function safeAttachmentName(path: string, submissionId: string): string {
  const base = path.split("/").pop()?.trim();
  if (base && !base.includes("..") && base.length <= 200) {
    return base;
  }
  return `abstract-${submissionId}`;
}

/** RFC 4122 UUID (any version), case-insensitive. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** Canonical non-negative integer string (e.g. `"42"`), for legacy numeric PKs — no digit-only regex. */
function parseCanonicalIntId(value: string): number | null {
  if (!value) {
    return null;
  }
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) {
    return null;
  }
  return String(n) === value ? n : null;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await assertAdminFromRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const raw = id?.trim() ?? "";
  const intId = parseCanonicalIntId(raw);
  const idForQuery: string | number | null = isUuid(raw) ? raw : intId;
  if (idForQuery === null) {
    return NextResponse.json({ error: "Missing or invalid submission id" }, { status: 400 });
  }

  const supabase = getServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { data: row, error: selectError } = await supabase
    .from("submissions")
    .select("file_path")
    .eq("id", idForQuery)
    .maybeSingle();

  if (selectError) {
    console.error("[admin/submissions download] Supabase select failed", {
      submissionId: idForQuery,
      message: selectError.message,
      details: selectError.details,
      hint: selectError.hint,
      code: selectError.code
    });
    return NextResponse.json({ error: selectError.message }, { status: 500 });
  }

  const filePath = typeof row?.file_path === "string" ? row.file_path.trim() : "";
  if (!filePath) {
    return NextResponse.json({ error: "No file uploaded for this submission." }, { status: 404 });
  }

  const { data: fileBlob, error: downloadError } = await supabase.storage.from(ABSTRACTS_BUCKET).download(filePath);

  if (downloadError || !fileBlob) {
    console.error("[admin/submissions download] Storage download failed", {
      submissionId: idForQuery,
      filePath,
      message: downloadError?.message,
      name: downloadError?.name
    });
    return NextResponse.json(
      { error: downloadError?.message ?? "Could not download file from storage." },
      { status: 502 }
    );
  }

  const fileName = safeAttachmentName(filePath, String(idForQuery));
  const contentType = mimeForPath(fileName);

  return new NextResponse(fileBlob, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${fileName.replace(/"/g, "")}"`
    }
  });
}
