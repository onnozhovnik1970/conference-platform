import { NextResponse } from "next/server";

import { assertAdminFromRequest, getServiceRoleClient } from "@/lib/admin-server";

/**
 * Columns used by the admin table (see dashboard `submissions` usage).
 * `reviewer_comment` and `status_updated_at`: migration 20260512120000_submissions_reviewer_fields.sql
 */
const SUBMISSION_SELECT =
  "id, user_id, created_at, abstract_title, thematic_panel, status, reviewer_comment, status_updated_at, file_path";

export async function GET(request: Request) {
  const auth = await assertAdminFromRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  const supabase = getServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { data: submissionRows, error: submissionsError } = await supabase
    .from("submissions")
    .select(SUBMISSION_SELECT)
    .order("created_at", { ascending: false });

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
