export type ConferenceSectionRow = {
  id: string;
  sort_order: number;
  slug: string | null;
  label_en: string;
  label_ua: string;
  zoom_link: string | null;
  zoom_meeting_id: string | null;
  zoom_password: string | null;
  start_time: string | null;
  created_at: string;
};

/** Columns returned by public and admin section APIs (after zoom migration). */
export const CONFERENCE_SECTION_SELECT_FULL =
  "id, sort_order, slug, label_en, label_ua, zoom_link, zoom_meeting_id, zoom_password, start_time, created_at";

export const CONFERENCE_SECTION_SELECT_NO_SLUG =
  "id, sort_order, label_en, label_ua, zoom_link, zoom_meeting_id, zoom_password, start_time, created_at";

export function sectionLabel(section: Pick<ConferenceSectionRow, "label_en" | "label_ua">, lang: string): string {
  return lang === "ua" || lang === "uk" ? section.label_ua : section.label_en;
}
