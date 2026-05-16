import { handleDashboardAiReviewSave, normalizeDashboardSubmissionId } from "@/lib/dashboard/ai-review-save";

/** PATCH /api/dashboard/submissions/:id/ai-review — save AI report (id in path). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleDashboardAiReviewSave(request, normalizeDashboardSubmissionId(id));
}
