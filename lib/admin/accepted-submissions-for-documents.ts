import type { SupabaseClient } from "@supabase/supabase-js";

export type ProfileExportMini = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  institution: string | null;
  role: string | null;
};

export type AcceptedSubmissionExportRow = {
  id: string | number;
  user_id: string;
  abstract_title: string | null;
  file_path: string | null;
  /** Optional legacy / alternate column; omitted if not present in DB. */
  file_url?: string | null;
  country: string | null;
  status?: string | null;
};

export function authorDisplayNameFromProfile(profile: ProfileExportMini | undefined): string {
  if (!profile) {
    return "—";
  }
  const parts = [profile.last_name, profile.first_name, profile.middle_name].filter(
    (p): p is string => typeof p === "string" && Boolean(p.trim())
  );
  return parts.join(" ").trim() || "—";
}

const SUBMISSION_SELECT_BASE =
  "id, user_id, abstract_title, file_path, country, status, archived_at";

export async function loadAcceptedSubmissionsForDocuments(
  supabase: SupabaseClient
): Promise<{ submissions: AcceptedSubmissionExportRow[]; profilesById: Record<string, ProfileExportMini> } | { error: string }> {
  let submissionRows: Record<string, unknown>[] | null = null;
  let submissionsError: { message?: string } | null = null;

  const withUrl = await supabase
    .from("submissions")
    .select(`${SUBMISSION_SELECT_BASE}, file_url`)
    .ilike("status", "accepted")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  const msg = (withUrl.error?.message ?? "").toLowerCase();
  if (withUrl.error && (msg.includes("file_url") || (withUrl.error as { code?: string }).code === "42703")) {
    const noUrl = await supabase
      .from("submissions")
      .select(SUBMISSION_SELECT_BASE)
      .ilike("status", "accepted")
      .is("archived_at", null)
      .order("created_at", { ascending: false });
    submissionRows = noUrl.data ?? null;
    submissionsError = noUrl.error;
  } else {
    submissionRows = withUrl.data ?? null;
    submissionsError = withUrl.error;
  }

  if (submissionsError) {
    return { error: submissionsError.message ?? "Submissions query failed" };
  }

  const submissions = (submissionRows ?? []) as AcceptedSubmissionExportRow[];
  const userIds = Array.from(new Set(submissions.map((s) => s.user_id).filter(Boolean))) as string[];

  let profilesById: Record<string, ProfileExportMini> = {};
  if (userIds.length > 0) {
    const { data: profs, error: pErr } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, middle_name, institution, role")
      .in("id", userIds);

    if (pErr) {
      return { error: pErr.message };
    }
    profilesById = Object.fromEntries((profs ?? []).map((p) => [p.id as string, p as ProfileExportMini]));
  }

  return { submissions, profilesById };
}
