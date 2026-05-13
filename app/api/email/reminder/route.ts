import { NextResponse } from "next/server";

import { assertAdminFromRequest, getServiceRoleClient } from "@/lib/admin-server";
import { runConferenceReminderEmails, tomorrowYmdLocal } from "@/lib/email/run-conference-reminders";

const CRON_HEADER = "x-email-reminder-secret";

async function assertReminderAuth(request: Request): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const secret = process.env.EMAIL_REMINDER_CRON_SECRET?.trim();
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
 * POST /api/email/reminder
 *
 * Sends bilingual reminder emails to all users with an accepted, non-archived submission.
 *
 * Auth: Bearer token (admin session) OR header `x-email-reminder-secret` matching `EMAIL_REMINDER_CRON_SECRET`.
 *
 * Query / JSON body:
 * - dryRun=true — count recipients only, no emails
 * - requireTomorrow=true — respond 409 unless `conference_settings.date` equals tomorrow (server local date); use for scheduled cron the day before
 */
export async function POST(request: Request) {
  const auth = await assertReminderAuth(request);
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
  const requireTomorrow =
    url.searchParams.get("requireTomorrow") === "true" ||
    body.requireTomorrow === true ||
    body.require_tomorrow === true;

  if (requireTomorrow) {
    const { data: settings } = await supabase.from("conference_settings").select("date").eq("id", 1).maybeSingle();
    const conferenceDate = settings?.date as string | null | undefined;
    const tomorrow = tomorrowYmdLocal();
    if (conferenceDate && conferenceDate !== tomorrow) {
      return NextResponse.json(
        {
          error: "Conference date is not tomorrow (server local calendar). Skipping send.",
          conferenceDate,
          tomorrow
        },
        { status: 409 }
      );
    }
  }

  try {
    const result = await runConferenceReminderEmails(supabase, { dryRun });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Reminder batch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
