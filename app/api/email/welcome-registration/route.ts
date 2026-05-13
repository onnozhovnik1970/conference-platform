import { NextResponse } from "next/server";

import { getServiceRoleClient } from "@/lib/admin-server";
import { sendRegistrationWelcomeEmail } from "@/lib/email/send-registration-welcome";

/**
 * POST /api/email/welcome-registration
 * Called after successful Supabase Auth sign-up + profile insert.
 * Requires Authorization: Bearer <access_token> from the new session (present when email confirmation is off or after confirm).
 */
export async function POST(request: Request) {
  const supabase = getServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Server misconfigured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const {
    data: { user },
    error: authErr
  } = await supabase.auth.getUser(token);

  if (authErr || !user?.email) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let firstName = "";
  try {
    const body = await request.json();
    if (body && typeof body === "object" && typeof (body as { firstName?: unknown }).firstName === "string") {
      firstName = (body as { firstName: string }).firstName.trim();
    }
  } catch {
    /* optional body */
  }

  if (!firstName) {
    const { data: profile } = await supabase.from("profiles").select("first_name").eq("id", user.id).maybeSingle();
    firstName = (profile?.first_name as string | undefined)?.trim() ?? "";
  }

  const displayName = firstName || user.email.split("@")[0] || "Participant";

  const result = await sendRegistrationWelcomeEmail(supabase, {
    to: user.email,
    firstName: displayName
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
