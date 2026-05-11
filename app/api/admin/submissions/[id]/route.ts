import { NextResponse } from "next/server";

import { assertAdminFromRequest, getServiceRoleClient } from "@/lib/admin-server";

const STATUS_OPTIONS = [
  "pending",
  "pending_review",
  "under_review",
  "accepted",
  "rejected",
  "needs_revision"
] as const;

function isAllowedStatus(value: unknown): value is (typeof STATUS_OPTIONS)[number] {
  return typeof value === "string" && (STATUS_OPTIONS as readonly string[]).includes(value);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await assertAdminFromRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  const rawId = params.id?.trim();
  if (!rawId || !/^\d+$/.test(rawId)) {
    return NextResponse.json({ error: "Missing or invalid submission id" }, { status: 400 });
  }
  const id = Number.parseInt(rawId, 10);

  const rawBodyText = await request.text();
  console.log("[admin/submissions PATCH] request body (exact raw)", rawBodyText);

  let body: unknown;
  try {
    body = rawBodyText.trim() === "" ? null : JSON.parse(rawBodyText);
  } catch {
    console.log("[admin/submissions PATCH] JSON.parse failed for body above");
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const status = (body as { status?: unknown }).status;
  const reviewerCommentRaw = (body as { reviewer_comment?: unknown }).reviewer_comment;

  if (!isAllowedStatus(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const reviewer_comment =
    reviewerCommentRaw === null || reviewerCommentRaw === undefined
      ? null
      : typeof reviewerCommentRaw === "string"
        ? reviewerCommentRaw.trim() || null
        : null;

  const supabase = getServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { data: updatedRows, error: updateError } = await supabase
    .from("submissions")
    .update({
      status,
      reviewer_comment,
      status_updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select("id");

  if (updateError) {
    console.log("[admin/submissions PATCH] Supabase error message:", updateError.message);
    console.log("[admin/submissions PATCH] Supabase error code:", updateError.code);
    console.log("[admin/submissions PATCH] Supabase error details:", updateError.details);
    console.log("[admin/submissions PATCH] Supabase error hint:", updateError.hint);
    console.error("[admin/submissions PATCH] Supabase update failed", {
      submissionId: id,
      payload: { status, reviewer_comment: reviewer_comment ? "[set]" : null },
      supabase: {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code
      }
    });
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (!updatedRows?.length) {
    console.error("[admin/submissions PATCH] No row updated (id not found or RLS blocked)", {
      submissionId: id,
      payload: { status, reviewer_comment: reviewer_comment ? "[set]" : null }
    });
    return NextResponse.json(
      { error: "No submission matched this id (not found or not permitted)." },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
