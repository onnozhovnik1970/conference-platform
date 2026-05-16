/** Participant-facing submission status (display + edit rules). */

export const SUBMISSION_STATUS_DRAFT = "draft";
export const SUBMISSION_STATUS_PENDING_REVIEW = "pending_review";

const LOCKED_STATUSES = new Set(["pending_review", "under_review", "accepted", "pending"]);

const EDITABLE_STATUSES = new Set(["draft", "needs_revision"]);

export type ParticipantDisplayStatus =
  | "draft"
  | "ai_check"
  | "under_review"
  | "needs_revision"
  | "rejected"
  | "accepted";

export function isSubmissionLocked(status: string | null | undefined): boolean {
  if (!status) {
    return false;
  }
  return LOCKED_STATUSES.has(status);
}

export function canEditSubmission(status: string | null | undefined): boolean {
  if (!status) {
    return true;
  }
  return EDITABLE_STATUSES.has(status);
}

export function canStartNewSubmissionRow(status: string | null | undefined): boolean {
  if (!status) {
    return true;
  }
  return status === "needs_revision" || status === "rejected";
}

export function getParticipantDisplayStatus(
  status: string | null | undefined,
  aiScore: number | null | undefined
): ParticipantDisplayStatus {
  if (status === "accepted") {
    return "accepted";
  }
  if (status === "rejected") {
    return "rejected";
  }
  if (status === "needs_revision") {
    return "needs_revision";
  }
  if (status === "pending_review" || status === "under_review" || status === "pending") {
    return "under_review";
  }
  if (aiScore !== null && aiScore !== undefined) {
    return "ai_check";
  }
  return "draft";
}

export function participantStatusBadgeClass(displayStatus: ParticipantDisplayStatus): string {
  const base = "inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold";
  switch (displayStatus) {
    case "accepted":
      return `${base} border-emerald-300 bg-emerald-50 text-emerald-800`;
    case "rejected":
      return `${base} border-rose-300 bg-rose-50 text-rose-800`;
    case "needs_revision":
      return `${base} border-orange-300 bg-orange-50 text-orange-800`;
    case "under_review":
      return `${base} border-sky-300 bg-sky-50 text-sky-800`;
    case "ai_check":
      return `${base} border-violet-300 bg-violet-50 text-violet-800`;
    default:
      return `${base} border-slate-300 bg-slate-50 text-slate-700`;
  }
}
