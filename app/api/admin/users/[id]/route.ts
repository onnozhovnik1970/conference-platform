import { NextResponse } from "next/server";

import { assertAdminFromRequest, getServiceRoleClient, isBootstrapAdminEmail } from "@/lib/admin-server";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await assertAdminFromRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  const { id: rawId } = await params;
  const targetId = rawId?.trim() ?? "";
  if (!UUID_RE.test(targetId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  let body: { role?: unknown };
  try {
    body = (await request.json()) as { role?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const role = body.role;
  if (role !== "user" && role !== "admin") {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const supabase = getServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { data: targetAuth, error: getUserErr } = await supabase.auth.admin.getUserById(targetId);
  if (getUserErr || !targetAuth?.user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const targetEmail = targetAuth.user.email;
  if (role === "user" && isBootstrapAdminEmail(targetEmail)) {
    return NextResponse.json(
      {
        error:
          "Cannot demote bootstrap admin accounts from the UI. Remove the email from ALLOWED_ADMIN_EMAILS in the codebase or update the database role after changing that list."
      },
      { status: 400 }
    );
  }

  const { data: existing } = await supabase.from("profiles").select("id").eq("id", targetId).maybeSingle();

  if (existing) {
    const { error: upErr } = await supabase.from("profiles").update({ role }).eq("id", targetId);
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }
  } else {
    const { error: insErr } = await supabase.from("profiles").insert({
      id: targetId,
      last_name: "—",
      first_name: "—",
      middle_name: null,
      institution: "—",
      role
    });
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, role });
}
