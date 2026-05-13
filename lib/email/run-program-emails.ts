import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";

import { formatConferenceStartsDateTimeKyiv } from "@/lib/conference-dates";
import { loadConferenceEmailBundle } from "@/lib/email/conference-email-bundle";
import { listAcceptedAuthorUserIds } from "@/lib/email/list-accepted-author-user-ids";
import { buildConferenceProgramHtml, type ProgramSectionRow } from "@/lib/email/program-html";
import { getResendEnv } from "@/lib/email/resend-config";

type SectionDbRow = {
  label_en: string;
  label_ua: string;
  zoom_link: string | null;
  start_time: string | null;
  sort_order: number;
};

export type ConferenceProgramBatchResult = {
  dryRun: boolean;
  recipientCount: number;
  sent: number;
  skippedNoEmail: number;
  failed: number;
  errors: Array<{ userId: string; message: string }>;
  conferenceDate: string | null;
};

export async function runConferenceProgramEmails(
  supabase: SupabaseClient,
  opts: { dryRun: boolean }
): Promise<ConferenceProgramBatchResult> {
  const env = getResendEnv();
  if (!env && !opts.dryRun) {
    throw new Error("RESEND_API_KEY or RESEND_FROM_EMAIL missing");
  }

  const bundle = await loadConferenceEmailBundle(supabase);

  const conferenceDate = (await supabase.from("conference_settings").select("date").eq("id", 1).maybeSingle()).data?.date as
    | string
    | null
    | undefined;

  const userIds = await listAcceptedAuthorUserIds(supabase);
  const recipientCount = userIds.length;

  const { data: sectionRows, error: secErr } = await supabase
    .from("conference_sections")
    .select("label_en, label_ua, zoom_link, start_time, sort_order")
    .order("sort_order", { ascending: true });

  if (secErr) {
    throw new Error(secErr.message);
  }

  const rows = (sectionRows ?? []) as SectionDbRow[];
  const programSections: ProgramSectionRow[] = rows.map((r) => {
    const st = r.start_time?.trim();
    return {
      labelUa: r.label_ua,
      labelEn: r.label_en,
      zoomLink: r.zoom_link?.trim() || null,
      startsUa: st ? formatConferenceStartsDateTimeKyiv(st, "ua") : "",
      startsEn: st ? formatConferenceStartsDateTimeKyiv(st, "en") : ""
    };
  });

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

    const html = buildConferenceProgramHtml({
      participantName,
      bundle,
      sections: programSections
    });

    const { error: sendErr } = await resend.emails.send({
      from: env!.from,
      to: [email],
      subject: "Програма конференції / Conference program — SUTE",
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
