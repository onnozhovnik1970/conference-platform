const DEFAULT_BUCKET = "abstracts";

/**
 * Turn a `file_path` or `file_url` value into the object key used by
 * `supabase.storage.from(bucket).download(key)` (no leading slash, no bucket prefix).
 */
function normalizeSupabaseStorageObjectKey(raw: string, bucket: string): string {
  let t = raw.trim();
  if (!t) {
    return "";
  }

  const bucketPrefix = `${bucket}/`;
  if (t.startsWith(bucketPrefix)) {
    t = t.slice(bucketPrefix.length);
  }

  const publicPrefix = `public/${bucket}/`;
  if (t.startsWith(publicPrefix)) {
    t = t.slice(publicPrefix.length);
  }

  if (!t.includes("://")) {
    return t.replace(/^\/+/, "");
  }

  const markers = [
    `/storage/v1/object/public/${bucket}/`,
    `/storage/v1/object/sign/${bucket}/`,
    `/storage/v1/object/authenticated/${bucket}/`,
    `/object/public/${bucket}/`,
    `/object/sign/${bucket}/`,
    `/object/authenticated/${bucket}/`
  ];

  for (const marker of markers) {
    const idx = t.indexOf(marker);
    if (idx === -1) {
      continue;
    }
    let tail = t.slice(idx + marker.length);
    tail = tail.split("?")[0] ?? "";
    tail = tail.split("#")[0] ?? "";
    try {
      return decodeURIComponent(tail).replace(/^\/+/, "");
    } catch {
      return tail.replace(/^\/+/, "");
    }
  }

  return "";
}

/**
 * Path inside the `abstracts` storage bucket for a submission file.
 * Handles plain keys (`userId/timestamp.pdf`), full Supabase Storage URLs, and `abstracts/...` prefixes.
 */
export function submissionStorageObjectPath(
  row: {
    file_path?: string | null;
    file_url?: string | null;
  },
  bucket: string = DEFAULT_BUCKET
): string {
  const fp = typeof row.file_path === "string" ? row.file_path.trim() : "";
  const fu = typeof row.file_url === "string" ? row.file_url.trim() : "";

  for (const raw of [fp, fu]) {
    if (!raw) {
      continue;
    }
    const key = normalizeSupabaseStorageObjectKey(raw, bucket);
    if (key) {
      return key;
    }
  }
  return "";
}
