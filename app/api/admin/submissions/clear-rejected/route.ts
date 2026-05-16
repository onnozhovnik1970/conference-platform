import { NextResponse } from "next/server";

import { deleteSubmissionRecord } from "@/lib/admin/delete-submission";
import { assertAdminFromRequest, getServiceRoleClient } from "@/lib/admin-server";

export async function POST(request: Request) {
  const auth = await assertAdminFromRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  const supabase = getServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { data: rows, error: listError } = await supabase
    .from("submissions")
    .select("id")
    .eq("status", "rejected")
    .is("archived_at", null);

  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }

  const ids = (rows ?? []).map((r) => r.id).filter((id) => id !== null && id !== undefined);
  let deleted = 0;
  const errors: string[] = [];

  for (const id of ids) {
    const result = await deleteSubmissionRecord(supabase, id);
    if (result.ok) {
      deleted += 1;
    } else {
      errors.push(`${id}: ${result.error}`);
    }
  }

  if (errors.length > 0 && deleted === 0) {
    return NextResponse.json({ error: errors[0], deleted, failed: errors.length }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    deleted,
    failed: errors.length,
    errors: errors.length ? errors : undefined
  });
}
