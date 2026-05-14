export type PageContentRow = {
  id: string;
  title_ua: string | null;
  title_en: string | null;
  content_ua: string | null;
  content_en: string | null;
  updated_at: string;
};

/** URL slug = primary key in `page_contents`. */
export const EDITABLE_PAGE_SLUGS = [
  "for-authors",
  "conference-program",
  "academic-integrity-policy",
  "ai-use-policy",
  "privacy-policy",
  "terms-of-use",
  "contact"
] as const;

export type EditablePageSlug = (typeof EDITABLE_PAGE_SLUGS)[number];

export const EDITABLE_PAGE_SLUG_SET = new Set<string>(EDITABLE_PAGE_SLUGS);

/** i18n key for fallback title when DB title is empty. */
export const EDITABLE_PAGES_META: readonly { slug: EditablePageSlug; fallbackTitleKey: string }[] = [
  { slug: "for-authors", fallbackTitleKey: "pageTitleForAuthors" },
  { slug: "conference-program", fallbackTitleKey: "pageTitleConferenceProgram" },
  { slug: "academic-integrity-policy", fallbackTitleKey: "pageTitleAcademicIntegrityPolicy" },
  { slug: "ai-use-policy", fallbackTitleKey: "pageTitleAiUsePolicy" },
  { slug: "privacy-policy", fallbackTitleKey: "pageTitlePrivacyPolicy" },
  { slug: "terms-of-use", fallbackTitleKey: "pageTitleTermsOfUse" },
  { slug: "contact", fallbackTitleKey: "pageTitleContact" }
] as const;

export function isEditablePageSlug(id: string): id is EditablePageSlug {
  return EDITABLE_PAGE_SLUG_SET.has(id);
}
