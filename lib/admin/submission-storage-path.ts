/**
 * Path inside the `abstracts` storage bucket for a submission file.
 * Prefer `file_path` (object key). If empty, try `file_url` when it is a Supabase public object URL.
 */
export function submissionStorageObjectPath(row: {
  file_path?: string | null;
  file_url?: string | null;
}): string {
  const fp = typeof row.file_path === "string" ? row.file_path.trim() : "";
  if (fp) {
    return fp;
  }
  const rawUrl = typeof row.file_url === "string" ? row.file_url.trim() : "";
  if (!rawUrl) {
    return "";
  }
  if (!rawUrl.includes("://")) {
    return rawUrl.replace(/^\/+/, "");
  }
  const bucket = "abstracts";
  const pub = `/object/public/${bucket}/`;
  const idx = rawUrl.indexOf(pub);
  if (idx !== -1) {
    const tail = rawUrl.slice(idx + pub.length).split("?")[0] ?? "";
    try {
      return decodeURIComponent(tail);
    } catch {
      return tail;
    }
  }
  const auth = `/object/authenticated/${bucket}/`;
  const j = rawUrl.indexOf(auth);
  if (j !== -1) {
    const tail = rawUrl.slice(j + auth.length).split("?")[0] ?? "";
    try {
      return decodeURIComponent(tail);
    } catch {
      return tail;
    }
  }
  return "";
}
