import type { SupabaseClient } from "@supabase/supabase-js";

import { formatConferenceIsoDate, formatConferenceStartsDateTimeKyiv } from "@/lib/conference-dates";
import { DEFAULT_CONFERENCE_SETTINGS, type ConferenceSettingsRow } from "@/lib/conference-settings";

export type ConferenceEmailBundle = {
  titleEn: string;
  titleUa: string;
  dateLongEn: string;
  dateLongUa: string;
  locationDisplay: string;
  plenaryWhenEn: string;
  plenaryWhenUa: string;
  zoomLink: string | null;
};

function mergeSettings(row: Partial<ConferenceSettingsRow> | null): ConferenceSettingsRow {
  return {
    ...DEFAULT_CONFERENCE_SETTINGS,
    ...(row ?? {})
  } as ConferenceSettingsRow;
}

/** Primary heading line (before newline) for compact email titles. */
export function firstTitleLine(title: string): string {
  const line = title.trim().split(/\r?\n/)[0]?.trim();
  return line || title.trim();
}

export async function loadConferenceEmailBundle(
  supabase: SupabaseClient
): Promise<ConferenceEmailBundle> {
  const { data } = await supabase.from("conference_settings").select("*").eq("id", 1).maybeSingle();

  const s = mergeSettings(data as Partial<ConferenceSettingsRow> | null);

  const dateLongEn = formatConferenceIsoDate(s.date, "en");
  const dateLongUa = formatConferenceIsoDate(s.date, "ua");
  const locationDisplay = (s.location ?? "").trim() || "Online";

  const plenaryWhenEn = s.plenary_start_time?.trim()
    ? formatConferenceStartsDateTimeKyiv(s.plenary_start_time, "en")
    : dateLongEn;
  const plenaryWhenUa = s.plenary_start_time?.trim()
    ? formatConferenceStartsDateTimeKyiv(s.plenary_start_time, "ua")
    : dateLongUa;

  return {
    titleEn: firstTitleLine(s.title ?? DEFAULT_CONFERENCE_SETTINGS.title),
    titleUa: firstTitleLine(s.title_ua ?? DEFAULT_CONFERENCE_SETTINGS.title_ua ?? s.title),
    dateLongEn,
    dateLongUa,
    locationDisplay,
    plenaryWhenEn,
    plenaryWhenUa,
    zoomLink: s.zoom_link?.trim() || null
  };
}
