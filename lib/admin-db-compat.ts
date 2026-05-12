/**
 * Detect PostgREST errors when optional migrations are not applied yet.
 * Messages vary slightly by PostgREST version; keep checks substring-based.
 */

export function isMissingSubmissionsSectionIdColumn(err: { message?: string } | null | undefined): boolean {
  const m = err?.message ?? "";
  return m.includes("section_id");
}

export function isConferenceSectionsTableMissing(err: { message?: string } | null | undefined): boolean {
  const m = (err?.message ?? "").toLowerCase();
  return (
    m.includes("conference_sections") &&
    (m.includes("schema cache") || m.includes("could not find") || (m.includes("relation") && m.includes("does not exist")))
  );
}

export function isMissingConferenceSectionsSlugColumn(err: { message?: string } | null | undefined): boolean {
  const m = err?.message ?? "";
  return m.includes("conference_sections") && m.includes("slug") && m.includes("does not exist");
}
