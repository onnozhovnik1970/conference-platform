export type ConferenceSettingsRow = {
  id: number;
  title: string;
  title_ua: string | null;
  /** ISO date string (YYYY-MM-DD); DB column is `"date"` */
  date: string | null;
  deadline: string | null;
  location: string | null;
  description: string | null;
  description_ua: string | null;
  zoom_link: string | null;
  zoom_details: string | null;
  updated_at: string;
};

export const DEFAULT_CONFERENCE_SETTINGS: Omit<ConferenceSettingsRow, "updated_at"> = {
  id: 1,
  title:
    'IX All-Ukrainian Student Scientific-Practical Conference in Foreign Languages "SCIENCE OF THE 21st CENTURY: CHALLENGES OF TODAY"',
  title_ua:
    "ІХ Всеукраїнська студентська науково-практична конференція іноземними мовами «НАУКА ХХІ СТОЛІТТЯ: ВИКЛИКИ СЬОГОДЕННЯ»",
  date: "2026-05-14",
  deadline: "2026-04-26",
  location: "Online via Zoom",
  description:
    "Discussion of student research on modern science trends and improving foreign language skills. Organizer: Department of Modern European Languages, State University of Trade and Economics (SUTE).",
  description_ua:
    "Обговорення студентських досліджень сучасних тенденцій науки та вдосконалення навичок володіння іноземними мовами.",
  zoom_link: null,
  zoom_details: "341 095 4568\n166231"
};
