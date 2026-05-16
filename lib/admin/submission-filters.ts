/** Admin panel submission status values (DB `submissions.status`). */
export const ADMIN_STATUS_OPTIONS = [
  "draft",
  "pending",
  "pending_review",
  "under_review",
  "accepted",
  "rejected",
  "needs_revision"
] as const;

export type AdminSubmissionStatus = (typeof ADMIN_STATUS_OPTIONS)[number];

export type AdminSubmissionsView = "all" | "under_review" | "accepted" | "needs_revision" | "rejected" | "archive";

const UNDER_REVIEW_STATUSES = new Set<AdminSubmissionStatus>([
  "draft",
  "pending",
  "pending_review",
  "under_review"
]);

export function isAdminSubmissionStatus(value: string): value is AdminSubmissionStatus {
  return (ADMIN_STATUS_OPTIONS as readonly string[]).includes(value);
}

export function normalizeAdminSubmissionStatus(value: string | null | undefined): AdminSubmissionStatus {
  if (value && isAdminSubmissionStatus(value)) {
    return value;
  }
  return "pending";
}

export function matchesAdminSubmissionsView(
  status: AdminSubmissionStatus,
  archivedAt: string | null,
  view: AdminSubmissionsView
): boolean {
  if (view === "archive") {
    return Boolean(archivedAt);
  }

  if (archivedAt) {
    return false;
  }

  switch (view) {
    case "all":
      return true;
    case "under_review":
      return UNDER_REVIEW_STATUSES.has(status);
    case "accepted":
      return status === "accepted";
    case "needs_revision":
      return status === "needs_revision";
    case "rejected":
      return status === "rejected";
    default:
      return false;
  }
}
