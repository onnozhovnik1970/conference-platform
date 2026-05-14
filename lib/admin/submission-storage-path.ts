const DEFAULT_BUCKET = "abstracts";

/**
 * Column names that may hold a Supabase Storage object key or public/signed URL.
 * Dashboard "Submit for review" uses `file_path` (see `app/dashboard/page.tsx`); production DBs
 * may use legacy or alternate names — we try these first, then any `*_path` / `*_url` string field.
 */
const STORAGE_FIELD_KEYS = [
  "file_path",
  "file_url",
  "abstract_file_path",
  "thesis_file_path",
  "attachment_path",
  "storage_path",
  "document_path",
  "upload_path",
  "media_path",
  "pdf_path",
  "object_path"
] as const;

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

function collectRawStorageCandidates(row: Record<string, unknown>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (s: string) => {
    const t = s.trim();
    if (!t || seen.has(t)) {
      return;
    }
    seen.add(t);
    out.push(t);
  };

  for (const key of STORAGE_FIELD_KEYS) {
    const v = row[key];
    if (typeof v === "string") {
      push(v);
    }
  }

  for (const [key, v] of Object.entries(row)) {
    if (typeof v !== "string") {
      continue;
    }
    const known = STORAGE_FIELD_KEYS as readonly string[];
    if (known.includes(key)) {
      continue;
    }
    const lk = key.toLowerCase();
    if (/(^|_)(path|url)$/.test(lk) || lk.includes("storage") || lk.includes("upload") || lk.includes("attachment")) {
      push(v);
    }
  }

  return out;
}

/**
 * Object key for `supabase.storage.from(bucket).download(key)` from a submission row
 * (from `select('*')` or explicit columns). Tries known field names then other `*_path` / `*_url` strings.
 */
export function submissionStorageObjectPath(row: Record<string, unknown>, bucket: string = DEFAULT_BUCKET): string {
  for (const raw of collectRawStorageCandidates(row)) {
    const key = normalizeSupabaseStorageObjectKey(raw, bucket);
    if (key) {
      return key;
    }
  }
  return "";
}
