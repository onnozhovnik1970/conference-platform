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

function safeAttachmentName(path: string, submissionId: number): string {
  const base = path.split("/").pop()?.trim();
  if (base && !base.includes("..") && base.length <= 200) {
    return base;
  }
  return `abstract-${submissionId}`;
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await assertAdminFromRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  const rawId = params.id?.trim();
  if (!rawId || !/^\d+$/.test(rawId)) {
    return NextResponse.json({ error: "Missing or invalid submission id" }, { status: 400 });
  }
  const id = Number.parseInt(rawId, 10);

  const supabase = getServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { data: row, error: selectError } = await supabase
    .from("submissions")
    .select("file_path")
    .eq("id", id)
    .maybeSingle();

  if (selectError) {
    console.error("[admin/submissions download] Supabase select failed", {
      submissionId: id,
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
      submissionId: id,
      filePath,
      message: downloadError?.message,
      name: downloadError?.name
    });
    return NextResponse.json(
      { error: downloadError?.message ?? "Could not download file from storage." },
      { status: 502 }
    );
  }

  const fileName = safeAttachmentName(filePath, id);
  const contentType = mimeForPath(fileName);

  return new NextResponse(fileBlob, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${fileName.replace(/"/g, "")}"`
    }
  });
}
