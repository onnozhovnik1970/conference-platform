const INVALID = /[<>:"/\\|?*\u0000-\u001f]/g;

/** Safe single segment for ZIP / attachment names (no path separators). */
export function sanitizeExportFilenamePart(raw: string, maxLen: number): string {
  const t = raw
    .replace(INVALID, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/ /g, "_");
  if (!t) {
    return "untitled";
  }
  if (t.length <= maxLen) {
    return t;
  }
  return t.slice(0, maxLen);
}

export function fileExtensionFromPath(path: string): string {
  const base = path.split("/").pop()?.trim().toLowerCase() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot < 0 || dot === base.length - 1) {
    return "";
  }
  return base.slice(dot);
}
