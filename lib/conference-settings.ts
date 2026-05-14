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
  hero_image_url: null
};
