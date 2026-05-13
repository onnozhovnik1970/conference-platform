import { NextResponse } from "next/server";

import { getServiceRoleClient } from "@/lib/admin-server";
import { sendRegistrationWelcomeEmail } from "@/lib/email/send-registration-welcome";

/**
 * POST /api/email/welcome-registration
 * Called after successful Supabase Auth sign-up + profile insert.
 *
 * Auth (either):
 * - Authorization: Bearer <access_token> (when Supabase returns a session), plus JSON body { firstName?, userId?, email? }
 * - No Bearer: JSON body { userId, email, firstName? } — email must match auth user (for email-confirmation flow with no session)
 */
export async function POST(request: Request) {
  const supabase = getServiceRoleClient();
  if (!supabase) {
    console.error("[welcome-registration] missing service role client");
    return NextResponse.json({ ok: false, error: "Server misconfigured" }, { status: 500 });
  }

  let body: Record<string, unknown> = {};
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    /* optional body */
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  const firstNameFromBody = typeof body.firstName === "string" ? body.firstName.trim() : "";

  console.log("[welcome-registration] POST", {
    hasBearer: Boolean(token),
    hasUserIdInBody: typeof body.userId === "string",
    hasEmailInBody: typeof body.email === "string"
  });

  let userId: string;
  let userEmail: string;

  if (token) {
    const {
      data: { user },
      error: authErr
    } = await supabase.auth.getUser(token);

    if (authErr || !user?.email) {
      console.warn("[welcome-registration] invalid bearer token", authErr?.message);
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    userId = user.id;
    userEmail = user.email;
  } else {
    const rawUserId = typeof body.userId === "string" ? body.userId.trim() : "";
    const emailClaim = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!rawUserId || !emailClaim) {
      console.warn("[welcome-registration] missing body auth: need userId + email when no session");
      return NextResponse.json({ ok: false, error: "Unauthorized or missing userId/email" }, { status: 401 });
    }

    const { data: authData, error: adminErr } = await supabase.auth.admin.getUserById(rawUserId);

    if (adminErr || !authData.user?.email) {
      console.warn("[welcome-registration] admin getUser failed", adminErr?.message);
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const serverEmail = authData.user.email.trim().toLowerCase();
    if (serverEmail !== emailClaim) {
      console.warn("[welcome-registration] email mismatch for userId");
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    userId = authData.user.id;
    userEmail = authData.user.email;
    console.log("[welcome-registration] verified via userId+email (no session)");
  }

  let firstName = firstNameFromBody;
  if (!firstName) {
    const { data: profile } = await supabase.from("profiles").select("first_name").eq("id", userId).maybeSingle();
    firstName = (profile?.first_name as string | undefined)?.trim() ?? "";
  }

  const displayName = firstName || userEmail.split("@")[0] || "Participant";

  console.log("[welcome-registration] sending Resend welcome", { userId, toDomain: userEmail.split("@")[1] ?? "?" });

  const result = await sendRegistrationWelcomeEmail(supabase, {
    to: userEmail,
    firstName: displayName
  });

  if (!result.ok) {
    console.error("[welcome-registration] send failed", result.error);
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  console.log("[welcome-registration] sent ok");
  return NextResponse.json({ ok: true });
}
