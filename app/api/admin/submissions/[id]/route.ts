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
    return NextResponse.json(
      { error: "Missing or invalid submission id", receivedId: params.id },
      { status: 400 }
    );
  }
  const id = Number.parseInt(rawId, 10);

  const rawBodyText = await request.text();

  let body: unknown;
  try {
    body = rawBodyText.trim() === "" ? null : JSON.parse(rawBodyText);
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", receivedRawBody: rawBodyText },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body", receivedBody: body }, { status: 400 });
  }

  const status = (body as { status?: unknown }).status;
  const reviewerCommentRaw = (body as { reviewer_comment?: unknown }).reviewer_comment;

  if (!isAllowedStatus(status)) {
    return NextResponse.json(
      { error: "Invalid status", receivedBody: body, receivedStatus: status },
      { status: 400 }
    );
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
    return NextResponse.json(
      {
        error: updateError.message,
        supabase: {
          message: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint
        },
        submissionId: id,
        payload: { status, reviewer_comment }
      },
      { status: 500 }
    );
  }

  if (!updatedRows?.length) {
    return NextResponse.json(
      {
        error: "No submission matched this id (not found or not permitted).",
        submissionId: id,
        payload: { status, reviewer_comment }
      },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
