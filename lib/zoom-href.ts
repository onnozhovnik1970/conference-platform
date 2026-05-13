/** Normalize a Zoom or web URL for use in href (add https if scheme omitted). */
export function zoomHref(raw: string): string {
  const s = raw.trim();
  if (!s) {
    return "#";
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) {
    return s;
  }
  return `https://${s}`;
}
