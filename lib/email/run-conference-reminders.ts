import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";

import { formatConferenceStartsDateTime } from "@/lib/conference-dates";
import { loadConferenceEmailBundle } from "@/lib/email/conference-email-bundle";
import type { ReminderSectionInfo } from "@/lib/email/reminder-html";
import { buildConferenceReminderHtml } from "@/lib/email/reminder-html";
import { getResendEnv } from "@/lib/email/resend-config";

type SubmissionRow = {
  user_id: string;
  section_id: string | null;
  thematic_panel: string | null;
  created_at: string;
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Calendar tomorrow (local server TZ) as YYYY-MM-DD for comparison with conference date column. */
export function tomorrowYmdLocal(): string {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
}

type SectionRow = {
  id: string;
  slug: string | null;
  label_en: string;
  label_ua: string;
  zoom_link: string | null;
  start_time: string | null;
};

function sectionToReminderInfo(sec: Pick<SectionRow, "label_en" | "label_ua" | "zoom_link" | "start_time">): ReminderSectionInfo {
  const st = sec.start_time?.trim();
  return {
    labelEn: sec.label_en,
    labelUa: sec.label_ua,
    zoomLink: sec.zoom_link?.trim() || null,
    startsEn: st ? formatConferenceStartsDateTime(st, "en") : "",
    startsUa: st ? formatConferenceStartsDateTime(st, "ua") : ""
  };
}

export type ConferenceReminderBatchResult = {
  dryRun: boolean;
  recipientCount: number;
  sent: number;
  skippedNoEmail: number;
  failed: number;
  errors: Array<{ userId: string; message: string }>;
  conferenceDate: string | null;
};

export async function runConferenceReminderEmails(
  supabase: SupabaseClient,
  opts: { dryRun: boolean }
): Promise<ConferenceReminderBatchResult> {
  const env = getResendEnv();
  if (!env && !opts.dryRun) {
    throw new Error("RESEND_API_KEY or RESEND_FROM_EMAIL missing");
  }

  const bundle = await loadConferenceEmailBundle(supabase);

  const conferenceDate = (await supabase.from("conference_settings").select("date").eq("id", 1).maybeSingle()).data?.date as
    | string
    | null
    | undefined;

  const { data: submissionRows, error: subErr } = await supabase
    .from("submissions")
    .select("user_id, section_id, thematic_panel, created_at")
    .eq("status", "accepted")
    .is("archived_at", null);

  if (subErr) {
    throw new Error(subErr.message);
  }

  const rows = (submissionRows ?? []) as SubmissionRow[];
  const sorted = [...rows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const latestByUser = new Map<string, SubmissionRow>();
  for (const row of sorted) {
    if (row.user_id && !latestByUser.has(row.user_id)) {
      latestByUser.set(row.user_id, row);
    }
  }

  const userIds = [...latestByUser.keys()];
  const recipientCount = userIds.length;

  const { data: sectionRows } = await supabase
    .from("conference_sections")
    .select("id, slug, label_en, label_ua, zoom_link, start_time");

  const sections = (sectionRows ?? []) as SectionRow[];
  const byId = new Map(sections.map((s) => [s.id, s]));
  const bySlug = new Map(sections.filter((s) => s.slug).map((s) => [String(s.slug).trim(), s]));

  function resolveSection(row: SubmissionRow): ReminderSectionInfo | null {
    if (row.section_id) {
      const sec = byId.get(row.section_id);
      if (sec) {
        return sectionToReminderInfo(sec);
      }
    }
    const tp = (row.thematic_panel ?? "").trim();
    if (tp) {
      const hit = bySlug.get(tp);
      if (hit) {
        return sectionToReminderInfo(hit);
      }
    }
    return null;
  }

  let profilesById: Record<string, { id: string; first_name: string | null; last_name: string | null }> = {};
  if (userIds.length > 0) {
    const { data: profileRows } = await supabase.from("profiles").select("id, first_name, last_name").in("id", userIds);
    profilesById = Object.fromEntries((profileRows ?? []).map((p) => [p.id as string, p]));
  }

  if (opts.dryRun) {
    return {
      dryRun: true,
      recipientCount,
      sent: 0,
      skippedNoEmail: 0,
      failed: 0,
      errors: [],
      conferenceDate: conferenceDate ?? null
    };
  }

  const resend = new Resend(env!.apiKey);
  let sent = 0;
  let skippedNoEmail = 0;
  let failed = 0;
  const errors: Array<{ userId: string; message: string }> = [];

  for (const uid of userIds) {
    const row = latestByUser.get(uid)!;
    const { data: authData, error: authErr } = await supabase.auth.admin.getUserById(uid);
    const email = authData?.user?.email?.trim();
    if (authErr || !email) {
      skippedNoEmail += 1;
      errors.push({ userId: uid, message: authErr?.message ?? "No email" });
      continue;
    }

    const prof = profilesById[uid];
    const participantName =
      [prof?.first_name, prof?.last_name].filter(Boolean).join(" ").trim() ||
      (email.split("@")[0] ?? "Participant");

    const html = buildConferenceReminderHtml({
      participantName,
      bundle,
      section: resolveSection(row)
    });

    const { error: sendErr } = await resend.emails.send({
      from: env!.from,
      to: [email],
      subject: "Нагадування: конференція завтра / Reminder: conference tomorrow — SUTE",
      html
    });

    if (sendErr) {
      failed += 1;
      errors.push({ userId: uid, message: sendErr.message ?? "Send failed" });
    } else {
      sent += 1;
    }
  }

  return {
    dryRun: false,
    recipientCount,
    sent,
    skippedNoEmail,
    failed,
    errors,
    conferenceDate: conferenceDate ?? null
  };
}
