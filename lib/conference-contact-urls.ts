/** Build tel: href from stored support phone (spaces allowed). */
export function telHrefFromSupportPhone(raw: string | null | undefined): string {
  const t = typeof raw === "string" ? raw.trim() : "";
  if (!t) {
    return "";
  }
  const compact = t.replace(/\s/g, "");
  if (!compact) {
    return "";
  }
  return compact.startsWith("tel:") ? compact : `tel:${compact}`;
}

export function supportPhoneDisplay(raw: string | null | undefined): string {
  return typeof raw === "string" ? raw.trim() : "";
}

export function supportEmailTrimmed(raw: string | null | undefined): string {
  return typeof raw === "string" ? raw.trim() : "";
}

/** Ensure https URL for external social links; returns null if empty or invalid. */
export function normalizeOutboundHttpsUrl(raw: string | null | undefined): string | null {
  const t = typeof raw === "string" ? raw.trim() : "";
  if (!t) {
    return null;
  }
  try {
    const withScheme = /^https?:\/\//i.test(t) ? t : `https://${t}`;
    const u = new URL(withScheme);
    if (u.protocol !== "https:" && u.protocol !== "http:") {
      return null;
    }
    return u.toString();
  } catch {
    return null;
  }
}
