import { NextResponse } from "next/server";

import { buildAiReviewDbPayload, type DashboardReviewResult } from "@/lib/dashboard-ai-report";
import { getServiceRoleClient } from "@/lib/admin-server";
import { canEditSubmission } from "@/lib/dashboard-submission";

async function assertSubmissionOwner(request: Request, submissionId: string) {
  const supabase = getServiceRoleClient();
  if (!supabase) {
    return { ok: false as const, response: NextResponse.json({ error: "Server misconfigured" }, { status: 500 }) };
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: row, error: fetchError } = await supabase
    .from("submissions")
    .select("id, user_id, status")
    .eq("id", submissionId)
    .maybeSingle();

  if (fetchError) {
    return { ok: false as const, response: NextResponse.json({ error: fetchError.message }, { status: 500 }) };
  }

  if (!row || row.user_id !== user.id) {
    return { ok: false as const, response: NextResponse.json({ error: "Submission not found" }, { status: 404 }) };
  }

  if (!canEditSubmission(row.status as string | null)) {
    return { ok: false as const, response: NextResponse.json({ error: "Submission is locked" }, { status: 403 }) };
  }

  return { ok: true as const, supabase, userId: user.id };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const submissionId = id?.trim();
  if (!submissionId) {
    return NextResponse.json({ error: "Missing submission id" }, { status: 400 });
  }

  const auth = await assertSubmissionOwner(request, submissionId);
  if (!auth.ok) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const review = (body as { review?: DashboardReviewResult }).review;
  const filePath = (body as { file_path?: unknown }).file_path;

  if (!review || typeof review !== "object") {
    return NextResponse.json({ error: "Missing review payload" }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = {
    ...buildAiReviewDbPayload(review)
  };

  if (typeof filePath === "string" && filePath.trim()) {
    updatePayload.file_path = filePath.trim();
  }

  const { data: updated, error: updateError } = await auth.supabase
    .from("submissions")
    .update(updatePayload)
    .eq("id", submissionId)
    .eq("user_id", auth.userId)
    .select(
      "id, status, ai_score, ai_summary, ai_issues, ai_recommendations, ai_formatting_issues, file_path, abstract_title, faculty, specialty, group_name, year_of_study, country, phone, abstract_language, section_id, supervisor_name, supervisor_title_degree, supervisor_position, has_presentation, created_at"
    )
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (!updated) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ submission: updated });
}
