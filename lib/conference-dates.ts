/** Format a YYYY-MM-DD column for display (noon UTC avoids DST edge cases). */
export function formatConferenceIsoDate(iso: string | null | undefined, locale: "en" | "ua"): string {
  if (!iso) {
    return "";
  }
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat(locale === "ua" ? "uk-UA" : "en-US", { dateStyle: "long" }).format(d);
}
