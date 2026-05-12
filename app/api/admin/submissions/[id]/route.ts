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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await assertAdminFromRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const rawId = id?.trim();
  if (!rawId) {
    return NextResponse.json(
      { error: "Missing or invalid submission id", receivedId: id },
      { status: 400 }
    );
  }
  const submissionId = rawId;

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
  const archiveRaw = (body as { archive?: unknown }).archive;

  const updatePayload: Record<string, unknown> = {
    status_updated_at: new Date().toISOString()
  };

  let hasWork = false;

  if (isAllowedStatus(status)) {
    const reviewer_comment =
      reviewerCommentRaw === null || reviewerCommentRaw === undefined
        ? null
        : typeof reviewerCommentRaw === "string"
          ? reviewerCommentRaw.trim() || null
          : null;
    updatePayload.status = status;
    updatePayload.reviewer_comment = reviewer_comment;
    hasWork = true;
  }

  if (typeof archiveRaw === "boolean") {
    updatePayload.archived_at = archiveRaw ? new Date().toISOString() : null;
    hasWork = true;
  }

  if (!hasWork) {
    return NextResponse.json(
      { error: "Provide a valid status/reviewer update and/or archive flag.", receivedBody: body },
      { status: 400 }
    );
  }

  const supabase = getServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { data: updatedRows, error: updateError } = await supabase
    .from("submissions")
    .update(updatePayload)
    .eq("id", submissionId)
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
        submissionId,
        payload: updatePayload
      },
      { status: 500 }
    );
  }

  if (!updatedRows?.length) {
    return NextResponse.json(
      {
        error: "No submission matched this id (not found or not permitted).",
        submissionId,
        payload: updatePayload
      },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
