export type ConferenceSectionRow = {
  id: string;
  sort_order: number;
  slug: string | null;
  label_en: string;
  label_ua: string;
  created_at: string;
};

export function sectionLabel(section: Pick<ConferenceSectionRow, "label_en" | "label_ua">, lang: string): string {
  return lang === "ua" || lang === "uk" ? section.label_ua : section.label_en;
}
