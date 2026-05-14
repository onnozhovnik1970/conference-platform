import type { SupabaseClient } from "@supabase/supabase-js";

export type ProfileExportMini = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  institution: string | null;
  role: string | null;
};

/** Full submission row from DB (`select('*')`) so alternate storage column names are available. */
export type AcceptedSubmissionExportRow = Record<string, unknown> & {
  id: string | number;
  user_id: string;
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

export async function loadAcceptedSubmissionsForDocuments(
  supabase: SupabaseClient
): Promise<{ submissions: AcceptedSubmissionExportRow[]; profilesById: Record<string, ProfileExportMini> } | { error: string }> {
  const { data: submissionRows, error: submissionsError } = await supabase
    .from("submissions")
    .select("*")
    .ilike("status", "accepted")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (submissionsError) {
    return { error: submissionsError.message };
  }

  const submissions = (submissionRows ?? []) as AcceptedSubmissionExportRow[];
  const userIds = Array.from(new Set(submissions.map((s) => String(s.user_id)).filter(Boolean)));

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
