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

/** Format an ISO instant for section start times on the public site. */
export function formatConferenceDateTime(iso: string | null | undefined, locale: "en" | "ua"): string {
  if (!iso) {
    return "";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat(locale === "ua" ? "uk-UA" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(d);
}

/**
 * "May 14, 2026, 2:25 PM" (en) / locale-appropriate uk-UA for live-session labels after "Starts:".
 */
export function formatConferenceStartsDateTime(iso: string | null | undefined, locale: "en" | "ua"): string {
  if (!iso) {
    return "";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  const loc = locale === "ua" ? "uk-UA" : "en-US";
  const datePart = new Intl.DateTimeFormat(loc, { dateStyle: "long" }).format(d);
  const timePart = new Intl.DateTimeFormat(loc, { timeStyle: "short" }).format(d);
  return `${datePart}, ${timePart}`;
}

/** Value for `<input type="datetime-local" />` from a DB/ISO timestamp. */
export function isoToDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) {
    return "";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parse `datetime-local` input to ISO string for Supabase `timestamptz`. */
export function datetimeLocalValueToIso(local: string): string | null {
  const t = local.trim();
  if (!t) {
    return null;
  }
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d.toISOString();
}
