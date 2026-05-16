import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import {
  buildAiReviewDbPayload,
  parseAiScore,
  type DashboardReviewResult
} from "@/lib/dashboard-ai-report";
import { getServiceRoleClient } from "@/lib/admin-server";
import { canEditSubmission } from "@/lib/dashboard-submission";

export const DASHBOARD_SUBMISSION_SELECT =
  "id, status, ai_score, ai_summary, ai_issues, ai_recommendations, ai_formatting_issues, file_path, abstract_title, faculty, specialty, group_name, year_of_study, country, phone, abstract_language, section_id, supervisor_name, supervisor_title_degree, supervisor_position, has_presentation, created_at";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizeDashboardSubmissionId(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const id = String(value).trim();
  if (!id || id === "undefined" || id === "null" || id === "NaN") {
    return null;
  }
  if (/^\d+$/.test(id) || UUID_RE.test(id)) {
    return id;
  }
  return null;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.filter((item): item is string => typeof item === "string");
}

export function parseReviewFromRequestBody(body: Record<string, unknown>): DashboardReviewResult | null {
  const nested = body.review;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    const r = nested as Record<string, unknown>;
    return {
      score: parseAiScore(r.score ?? r.ai_score),
      scoreMax: typeof r.scoreMax === "number" ? r.scoreMax : 10,
      summary: typeof r.summary === "string" ? r.summary : typeof r.ai_summary === "string" ? r.ai_summary : undefined,
      issues: asStringArray(r.issues ?? r.ai_issues) ?? [],
      recommendations: asStringArray(r.recommendations ?? r.ai_recommendations) ?? [],
      formattingIssues: asStringArray(r.formattingIssues ?? r.ai_formatting_issues) ?? []
    };
  }

  const hasFlatFields =
    "score" in body ||
    "ai_score" in body ||
    "summary" in body ||
    "ai_summary" in body ||
    "issues" in body ||
    "ai_issues" in body;

  if (!hasFlatFields) {
    return null;
  }

  return {
    score: parseAiScore(body.score ?? body.ai_score),
    scoreMax: typeof body.scoreMax === "number" ? body.scoreMax : 10,
    summary:
      typeof body.summary === "string"
        ? body.summary
        : typeof body.ai_summary === "string"
          ? body.ai_summary
          : undefined,
    issues: asStringArray(body.issues ?? body.ai_issues) ?? [],
    recommendations: asStringArray(body.recommendations ?? body.ai_recommendations) ?? [],
    formattingIssues: asStringArray(body.formattingIssues ?? body.ai_formatting_issues) ?? []
  };
}

export function reviewPayloadHasContent(review: DashboardReviewResult): boolean {
  if (parseAiScore(review.score) !== undefined) {
    return true;
  }
  if (review.summary?.trim()) {
    return true;
  }
  return Boolean(review.issues?.length || review.recommendations?.length || review.formattingIssues?.length);
}

export async function getDashboardUserFromRequest(
  request: Request
): Promise<{ ok: true; supabase: SupabaseClient; user: User } | { ok: false; response: NextResponse }> {
  const supabase = getServiceRoleClient();
  if (!supabase) {
    return { ok: false, response: NextResponse.json({ error: "Server misconfigured" }, { status: 500 }) };
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { ok: true, supabase, user };
}

export async function saveDashboardAiReview(params: {
  supabase: SupabaseClient;
  userId: string;
  submissionId: string;
  review: DashboardReviewResult;
  filePath?: string | null;
}): Promise<{ ok: true; submission: Record<string, unknown> } | { ok: false; response: NextResponse }> {
  const { supabase, userId, submissionId, review, filePath } = params;

  const { data: row, error: fetchError } = await supabase
    .from("submissions")
    .select("id, user_id, status")
    .eq("id", submissionId)
    .maybeSingle();

  if (fetchError) {
    return {
      ok: false,
      response: NextResponse.json({ error: fetchError.message }, { status: 500 })
    };
  }

  if (!row || row.user_id !== userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Submission not found", submissionId }, { status: 404 })
    };
  }

  if (!canEditSubmission(row.status as string | null)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Submission is locked" }, { status: 403 })
    };
  }

  const updatePayload: Record<string, unknown> = {
    ...buildAiReviewDbPayload(review)
  };

  if (typeof filePath === "string" && filePath.trim()) {
    updatePayload.file_path = filePath.trim();
  }

  const { data: updated, error: updateError } = await supabase
    .from("submissions")
    .update(updatePayload)
    .eq("id", submissionId)
    .eq("user_id", userId)
    .select(DASHBOARD_SUBMISSION_SELECT)
    .maybeSingle();

  if (updateError) {
    console.error("[dashboard/ai-review] update failed", {
      submissionId,
      message: updateError.message,
      code: updateError.code,
      details: updateError.details,
      hint: updateError.hint,
      payload: updatePayload
    });
    const status = updateError.code === "22P02" || updateError.code === "23514" ? 400 : 500;
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: updateError.message,
          code: updateError.code,
          submissionId,
          payload: updatePayload
        },
        { status }
      )
    };
  }

  if (!updated) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Update failed", submissionId }, { status: 500 })
    };
  }

  return { ok: true, submission: updated as Record<string, unknown> };
}

function validationErrorResponse(
  error: string,
  status: number,
  body: Record<string, unknown>,
  extra?: Record<string, unknown>
): NextResponse {
  console.log("Request body:", JSON.stringify(body, null, 2));
  console.log("Validation error:", error, extra ?? {});
  return NextResponse.json({ error, ...extra }, { status });
}

export async function handleDashboardAiReviewSave(
  request: Request,
  submissionIdFromPath: string | null
): Promise<NextResponse> {
  console.log("[dashboard/ai-review] incoming", {
    method: request.method,
    pathSubmissionId: submissionIdFromPath
  });

  const auth = await getDashboardUserFromRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  const rawText = await request.text();
  let body: unknown;
  try {
    body = rawText.trim() === "" ? null : JSON.parse(rawText);
  } catch (parseError) {
    const error = "Invalid JSON body";
    console.log("Request body:", rawText.slice(0, 2000));
    console.log("Validation error:", error, parseError);
    return NextResponse.json({ error }, { status: 400 });
  }

  const record =
    body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;

  if (!record) {
    const error = "Invalid body";
    console.log("Request body:", JSON.stringify(body, null, 2));
    console.log("Validation error:", error);
    return NextResponse.json({ error, received: body }, { status: 400 });
  }

  console.log("Request body:", JSON.stringify(record, null, 2));

  const submissionId =
    normalizeDashboardSubmissionId(submissionIdFromPath) ??
    normalizeDashboardSubmissionId(record.submission_id) ??
    normalizeDashboardSubmissionId(record.submissionId);

  if (!submissionId) {
    const error = "Missing or invalid submission_id. Save the submission first, then attach AI results.";
    console.log("Validation error:", error, {
      pathId: submissionIdFromPath,
      submission_id: record.submission_id,
      submissionId: record.submissionId,
      receivedBodyKeys: Object.keys(record)
    });
    return validationErrorResponse(error, 400, record, {
      receivedBodyKeys: Object.keys(record)
    });
  }

  const review = parseReviewFromRequestBody(record);
  if (!review || !reviewPayloadHasContent(review)) {
    const error =
      "Missing or empty review payload (need score, summary, issues, or recommendations).";
    console.log("Validation error:", error, {
      submissionId,
      parsedReview: review,
      receivedBodyKeys: Object.keys(record)
    });
    return validationErrorResponse(error, 400, record, {
      submissionId,
      parsedReview: review,
      receivedBodyKeys: Object.keys(record)
    });
  }

  const filePathRaw = record.file_path ?? record.filePath;
  const filePath = typeof filePathRaw === "string" ? filePathRaw : null;

  console.log("[dashboard/ai-review] saving", {
    submissionId,
    userId: auth.user.id,
    reviewScore: review.score,
    hasSummary: Boolean(review.summary?.trim()),
    filePath: filePath ?? null
  });

  const result = await saveDashboardAiReview({
    supabase: auth.supabase,
    userId: auth.user.id,
    submissionId,
    review,
    filePath
  });

  if (!result.ok) {
    const errorBody = await result.response.clone().json().catch(() => ({}));
    console.log("Request body:", JSON.stringify(record, null, 2));
    console.log("Validation error:", (errorBody as { error?: string }).error ?? "Database update failed", errorBody);
    return result.response;
  }

  console.log("[dashboard/ai-review] saved", { submissionId });
  return NextResponse.json({ submission: result.submission });
}
