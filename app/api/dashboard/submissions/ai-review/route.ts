import { handleDashboardAiReviewSave } from "@/lib/dashboard/ai-review-save";

/** POST /api/dashboard/submissions/ai-review — save AI report (submission_id in body). */
export async function POST(request: Request) {
  return handleDashboardAiReviewSave(request, null);
}
