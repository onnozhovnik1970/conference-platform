export type HeroType = "image" | "particles";

export function parseHeroType(value: string | null | undefined): HeroType {
  return value === "particles" ? "particles" : "image";
}

export const DEFAULT_HERO_BG_COLOR = "#3aacaa";

/** Normalizes a hex color or returns null if invalid. */
export function normalizeHeroBgColor(value: string | null | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }
  const s = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s)) {
    return s.toLowerCase();
  }
  const short = s.match(/^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/);
  if (short) {
    return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toLowerCase();
  }
  return null;
}

export function parseHeroBgColor(value: string | null | undefined): string {
  return normalizeHeroBgColor(value) ?? DEFAULT_HERO_BG_COLOR;
}

export type ConferenceSettingsRow = {
  id: number;
  title: string;
  title_ua: string | null;
  /** Secondary hero line (English), shown as H2 under the main hero title. */
  hero_subtitle: string | null;
  /** Secondary hero line (Ukrainian). */
  hero_subtitle_ua: string | null;
  /** ISO date string (YYYY-MM-DD); DB column is `"date"` */
  date: string | null;
  /** Plenary session start instant (timestamptz ISO from API). */
  plenary_start_time: string | null;
  deadline: string | null;
  location: string | null;
  description: string | null;
  description_ua: string | null;
  zoom_link: string | null;
  zoom_details: string | null;
  meta_title: string | null;
  meta_description: string | null;
  support_phone: string | null;
  support_email: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  telegram_url: string | null;
  hero_image_url: string | null;
  /** Home hero background: banner image or animated particles. */
  hero_type: HeroType;
  /** Particles hero background color (hex). */
  hero_bg_color: string | null;
  /** PNG/SVG for certificate PDF background (e.g. /images/certificate.png). */
  certificate_template_url: string | null;
  updated_at: string;
};

export const DEFAULT_CONFERENCE_SETTINGS: Omit<ConferenceSettingsRow, "updated_at"> = {
  id: 1,
  title: "SCIENCE OF THE 21st CENTURY: CHALLENGES OF TODAY",
  title_ua: "НАУКА ХХІ СТОЛІТТЯ: ВИКЛИКИ СЬОГОДЕННЯ",
  hero_subtitle: "IX All-Ukrainian Student Scientific-Practical Conference in Foreign Languages",
  hero_subtitle_ua: "ІХ Всеукраїнська студентська науково-практична конференція іноземними мовами",
  date: "2026-05-14",
  plenary_start_time: null,
  deadline: "2026-04-26",
  location: "Online via Zoom",
  description:
    "Discussion of student research on modern science trends and improving foreign language skills. Organizer: Department of Modern European Languages, State University of Trade and Economics (SUTE).",
  description_ua:
    "Обговорення студентських досліджень сучасних тенденцій науки та вдосконалення навичок володіння іноземними мовами.",
  zoom_link: null,
  zoom_details: "341 095 4568\n166231",
  meta_title: null,
  meta_description: null,
  support_phone: null,
  support_email: null,
  facebook_url: null,
  instagram_url: null,
  telegram_url: null,
  hero_image_url: null,
  hero_type: "image",
  hero_bg_color: DEFAULT_HERO_BG_COLOR,
  certificate_template_url: null
};
