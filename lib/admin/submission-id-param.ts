const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Admin submission routes receive DB `submissions.id` (numeric) or legacy UUID strings.
 */
export function normalizeAdminSubmissionIdParam(raw: string | undefined): string | null {
  const id = raw?.trim() ?? "";
  if (!id) {
    return null;
  }
  if (/^\d+$/.test(id)) {
    return id;
  }
  if (UUID_RE.test(id)) {
    return id;
  }
  return null;
}
