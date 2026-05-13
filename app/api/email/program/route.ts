import { NextResponse } from "next/server";

import { assertAdminFromRequest, getServiceRoleClient } from "@/lib/admin-server";
import { runConferenceProgramEmails } from "@/lib/email/run-program-emails";

const CRON_HEADER = "x-email-program-secret";

async function assertProgramAuth(request: Request): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const secret = process.env.EMAIL_PROGRAM_CRON_SECRET?.trim();
  const header = request.headers.get(CRON_HEADER)?.trim();
  if (secret && header === secret) {
    return { ok: true };
  }
  const admin = await assertAdminFromRequest(request);
  if (!admin.ok) {
    return { ok: false, response: admin.response };
  }
  return { ok: true };
}

/**
 * POST /api/email/program
 *
 * Sends bilingual program HTML to all users with an accepted, non-archived submission.
 *
 * Auth: Bearer (admin) OR `x-email-program-secret` matching `EMAIL_PROGRAM_CRON_SECRET`.
 *
 * Query / body: `dryRun=true` — count recipients only.
 */
export async function POST(request: Request) {
  const auth = await assertProgramAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const supabase = getServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
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

  const url = new URL(request.url);
  const dryRun =
    url.searchParams.get("dryRun") === "true" || body.dryRun === true || body.dry_run === true;

  try {
    const result = await runConferenceProgramEmails(supabase, { dryRun });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Program email batch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
