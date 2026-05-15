import type { SupabaseClient } from "@supabase/supabase-js";

import { isMissingSubmissionsSectionIdColumn } from "@/lib/admin-db-compat";
import { formatConferenceIsoDate } from "@/lib/conference-dates";
import { firstTitleLine } from "@/lib/email/conference-email-bundle";
import { certificateLanguageFromAbstractLanguage, resolveCertificateLanguage, type CertificateLanguage } from "@/lib/certificates/translations";
import { DEFAULT_CONFERENCE_SETTINGS, type ConferenceSettingsRow } from "@/lib/conference-settings";

export type CertificatePayload = {
  submissionId: string;
  userId: string;
  participantName: string;
  abstractTitle: string;
  sectionBilingual: string;
  supervisorBlock: string;
  institution: string;
  titleUa: string;
  titleEn: string;
  dateUa: string;
  dateEn: string;
  /** ISO `YYYY-MM-DD` from conference settings for locale-aware certificate date line. */
  conferenceDateIso: string | null;
  locationDisplay: string;
  /** Derived from `abstract_language` on the submission; may be overridden by `?lang=` when generating. */
  certificateLanguage: CertificateLanguage;
  /** From `conference_settings.certificate_template_url`; PDF uses bundled template when null/empty. */
  certificateTemplateUrl: string | null;
};

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  institution: string | null;
};

type SectionRow = { id: string; slug: string | null; label_en: string; label_ua: string };

type SubmissionCertRow = {
  id: string | number;
  user_id: string;
  abstract_title: string | null;
  abstract_language: string | null;
  thematic_panel: string | null;
  section_id: string | null;
  supervisor_name: string | null;
  supervisor_title_degree: string | null;
  supervisor_position: string | null;
  status: string | null;
  archived_at: string | null;
};

function buildParticipantName(profile: ProfileRow | undefined): string {
  if (!profile) {
    return "—";
  }
  const parts = [profile.last_name, profile.first_name, profile.middle_name].filter(
    (p): p is string => typeof p === "string" && Boolean(p.trim())
  );
  return parts.join(" ").trim() || "—";
}

function buildSupervisorBlock(s: SubmissionCertRow): string {
  const name = (s.supervisor_name ?? "").trim();
  const title = (s.supervisor_title_degree ?? "").trim();
  const position = (s.supervisor_position ?? "").trim();
  const lines: string[] = [];
  if (name) {
    lines.push(name);
  }
  if (title) {
    lines.push(title);
  }
  if (position) {
    lines.push(position);
  }
  return lines.length > 0 ? lines.join("\n") : "—";
}

function sectionBilingualLabel(
  row: SubmissionCertRow,
  byId: Map<string, SectionRow>,
  bySlug: Map<string, SectionRow>
): string {
  if (row.section_id) {
    const sec = byId.get(row.section_id);
    if (sec) {
      const ua = sec.label_ua.trim();
      const en = sec.label_en.trim();
      if (ua && en && ua !== en) {
        return `${ua} / ${en}`;
      }
      return ua || en || "—";
    }
  }
  const tp = (row.thematic_panel ?? "").trim();
  if (tp) {
    const hit = bySlug.get(tp);
    if (hit) {
      const ua = hit.label_ua.trim();
      const en = hit.label_en.trim();
      if (ua && en && ua !== en) {
        return `${ua} / ${en}`;
      }
      return ua || en || "—";
    }
    return tp;
  }
  return "—";
}

function mergeSettings(row: Partial<ConferenceSettingsRow> | null): ConferenceSettingsRow {
  return {
    ...DEFAULT_CONFERENCE_SETTINGS,
    ...(row ?? {})
  } as ConferenceSettingsRow;
}

const SUBMISSION_SELECT_WITH_SECTION =
  "id, user_id, abstract_title, abstract_language, thematic_panel, section_id, supervisor_name, supervisor_title_degree, supervisor_position, status, archived_at";

const SUBMISSION_SELECT_WITHOUT_SECTION =
  "id, user_id, abstract_title, abstract_language, thematic_panel, supervisor_name, supervisor_title_degree, supervisor_position, status, archived_at";

async function fetchAcceptedSubmissions(supabase: SupabaseClient): Promise<SubmissionCertRow[]> {
  const first = await supabase
    .from("submissions")
    .select(SUBMISSION_SELECT_WITH_SECTION)
    .eq("status", "accepted")
    .is("archived_at", null)
    .order("id", { ascending: true });

  if (first.error && isMissingSubmissionsSectionIdColumn(first.error)) {
    const second = await supabase
      .from("submissions")
      .select(SUBMISSION_SELECT_WITHOUT_SECTION)
      .eq("status", "accepted")
      .is("archived_at", null)
      .order("id", { ascending: true });
    if (second.error) {
      throw new Error(second.error.message);
    }
    return ((second.data ?? []) as SubmissionCertRow[]).map((r) => ({ ...r, section_id: null }));
  }

  if (first.error) {
    throw new Error(first.error.message);
  }
  return (first.data ?? []) as SubmissionCertRow[];
}

function resolvePayloadLanguage(abstractLanguage: string | null | undefined, override: string | null | undefined): CertificateLanguage {
  const fromQuery = resolveCertificateLanguage(override ?? undefined);
  if (fromQuery) {
    return fromQuery;
  }
  return certificateLanguageFromAbstractLanguage(abstractLanguage);
}

export type LoadCertificatePayloadOptions = {
  /** When set (e.g. `?lang=de` from admin), overrides submission `abstract_language`. */
  languageOverride?: string | null;
};

export async function loadCertificatePayloads(
  supabase: SupabaseClient,
  options?: LoadCertificatePayloadOptions
): Promise<CertificatePayload[]> {
  const submissions = await fetchAcceptedSubmissions(supabase);
  if (submissions.length === 0) {
    return [];
  }

  const { data: settingsRow } = await supabase.from("conference_settings").select("*").eq("id", 1).maybeSingle();
  const s = mergeSettings(settingsRow as Partial<ConferenceSettingsRow> | null);
  const titleUa = firstTitleLine(s.title_ua ?? s.title ?? DEFAULT_CONFERENCE_SETTINGS.title_ua ?? "");
  const titleEn = firstTitleLine(s.title ?? DEFAULT_CONFERENCE_SETTINGS.title);
  const dateUa = formatConferenceIsoDate(s.date, "ua");
  const dateEn = formatConferenceIsoDate(s.date, "en");
  const locationDisplay = (s.location ?? "").trim() || "Online";

  const { data: sectionRows } = await supabase.from("conference_sections").select("id, slug, label_en, label_ua");
  const sections = (sectionRows ?? []) as SectionRow[];
  const byId = new Map(sections.map((x) => [x.id, x]));
  const bySlug = new Map(sections.filter((x) => x.slug).map((x) => [String(x.slug).trim(), x]));

  const userIds = [...new Set(submissions.map((r) => r.user_id).filter(Boolean))];
  const { data: profRows, error: pErr } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, middle_name, institution")
    .in("id", userIds);

  if (pErr) {
    throw new Error(pErr.message);
  }

  const profilesById = Object.fromEntries((profRows ?? []).map((p) => [p.id as string, p as ProfileRow]));

  return submissions.map((row) => ({
    submissionId: String(row.id),
    userId: row.user_id,
    participantName: buildParticipantName(profilesById[row.user_id]),
    abstractTitle: (row.abstract_title ?? "").trim() || "—",
    sectionBilingual: sectionBilingualLabel(row, byId, bySlug),
    supervisorBlock: buildSupervisorBlock(row),
    institution: (profilesById[row.user_id]?.institution ?? "").trim() || "—",
    titleUa,
    titleEn,
    dateUa: dateUa || "—",
    dateEn: dateEn || "—",
    conferenceDateIso: s.date,
    locationDisplay,
    certificateLanguage: resolvePayloadLanguage(row.abstract_language, options?.languageOverride),
    certificateTemplateUrl: s.certificate_template_url?.trim() ? s.certificate_template_url.trim() : null
  }));
}

export async function loadCertificatePayloadBySubmissionId(
  supabase: SupabaseClient,
  submissionId: string,
  options?: LoadCertificatePayloadOptions
): Promise<CertificatePayload | null> {
  const first = await supabase
    .from("submissions")
    .select(SUBMISSION_SELECT_WITH_SECTION)
    .eq("id", submissionId)
    .maybeSingle();

  let row: SubmissionCertRow | null = null;

  if (first.error && isMissingSubmissionsSectionIdColumn(first.error)) {
    const second = await supabase
      .from("submissions")
      .select(SUBMISSION_SELECT_WITHOUT_SECTION)
      .eq("id", submissionId)
      .maybeSingle();
    if (second.error) {
      throw new Error(second.error.message);
    }
    if (second.data) {
      row = { ...(second.data as SubmissionCertRow), section_id: null };
    }
  } else if (first.error) {
    throw new Error(first.error.message);
  } else if (first.data) {
    row = first.data as SubmissionCertRow;
  }

  if (!row || row.status !== "accepted" || row.archived_at) {
    return null;
  }

  const { data: settingsRow } = await supabase.from("conference_settings").select("*").eq("id", 1).maybeSingle();
  const s = mergeSettings(settingsRow as Partial<ConferenceSettingsRow> | null);
  const titleUa = firstTitleLine(s.title_ua ?? s.title ?? DEFAULT_CONFERENCE_SETTINGS.title_ua ?? "");
  const titleEn = firstTitleLine(s.title ?? DEFAULT_CONFERENCE_SETTINGS.title);
  const dateUa = formatConferenceIsoDate(s.date, "ua");
  const dateEn = formatConferenceIsoDate(s.date, "en");
  const locationDisplay = (s.location ?? "").trim() || "Online";

  const { data: sectionRows } = await supabase.from("conference_sections").select("id, slug, label_en, label_ua");
  const sections = (sectionRows ?? []) as SectionRow[];
  const byId = new Map(sections.map((x) => [x.id, x]));
  const bySlug = new Map(sections.filter((x) => x.slug).map((x) => [String(x.slug).trim(), x]));

  const { data: prof, error: pErr } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, middle_name, institution")
    .eq("id", row.user_id)
    .maybeSingle();

  if (pErr) {
    throw new Error(pErr.message);
  }

  const profile = prof as ProfileRow | null;

  return {
    submissionId: String(row.id),
    userId: row.user_id,
    participantName: buildParticipantName(profile ?? undefined),
    abstractTitle: (row.abstract_title ?? "").trim() || "—",
    sectionBilingual: sectionBilingualLabel(row, byId, bySlug),
    supervisorBlock: buildSupervisorBlock(row),
    institution: (profile?.institution ?? "").trim() || "—",
    titleUa,
    titleEn,
    dateUa: dateUa || "—",
    dateEn: dateEn || "—",
    conferenceDateIso: s.date,
    locationDisplay,
    certificateLanguage: resolvePayloadLanguage(row.abstract_language, options?.languageOverride),
    certificateTemplateUrl: s.certificate_template_url?.trim() ? s.certificate_template_url.trim() : null
  };
}
