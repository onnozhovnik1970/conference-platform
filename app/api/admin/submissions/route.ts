import { NextResponse } from "next/server";

import { isMissingSubmissionsSectionIdColumn } from "@/lib/admin-db-compat";
import { assertAdminFromRequest, getServiceRoleClient } from "@/lib/admin-server";

/**
 * Columns used by the admin table (see dashboard `submissions` usage).
 * `reviewer_comment` and `status_updated_at`: migration 20260512120000_submissions_reviewer_fields.sql
 * `section_id`: migration 20260516100000_conference_sections.sql
 */
const SUBMISSION_SELECT_WITH_SECTION =
  "id, user_id, created_at, abstract_title, thematic_panel, section_id, status, reviewer_comment, status_updated_at, file_path, archived_at";

const SUBMISSION_SELECT_WITHOUT_SECTION =
  "id, user_id, created_at, abstract_title, thematic_panel, status, reviewer_comment, status_updated_at, file_path, archived_at";

export async function GET(request: Request) {
  const auth = await assertAdminFromRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  const supabase = getServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  let submissionRows: Record<string, unknown>[] | null = null;
  let submissionsError = null as { message?: string } | null;

  const first = await supabase
    .from("submissions")
    .select(SUBMISSION_SELECT_WITH_SECTION)
    .order("created_at", { ascending: false });

  if (first.error && isMissingSubmissionsSectionIdColumn(first.error)) {
    const second = await supabase
      .from("submissions")
      .select(SUBMISSION_SELECT_WITHOUT_SECTION)
      .order("created_at", { ascending: false });
    submissionRows = (second.data ?? []).map((row) => ({ ...row, section_id: null }));
    submissionsError = second.error;
  } else {
    submissionRows = first.data ?? null;
    submissionsError = first.error;
  }

  if (submissionsError) {
    return NextResponse.json({ error: submissionsError.message }, { status: 500 });
  }

  const submissions = submissionRows ?? [];
  const userIds = Array.from(new Set(submissions.map((row) => row.user_id).filter(Boolean))) as string[];

  let profilesById: Record<
    string,
    {
      id: string;
      first_name: string | null;
      last_name: string | null;
      middle_name: string | null;
    }
  > = {};

  if (userIds.length > 0) {
    const { data: profileRows, error: profilesError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, middle_name")
      .in("id", userIds);

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    profilesById = Object.fromEntries((profileRows ?? []).map((profile) => [profile.id as string, profile]));
  }

  return NextResponse.json({ submissions, profilesById });
}
