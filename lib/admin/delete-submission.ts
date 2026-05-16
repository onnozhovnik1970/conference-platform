import type { SupabaseClient } from "@supabase/supabase-js";

import { submissionStorageObjectPath } from "@/lib/admin/submission-storage-path";

const ABSTRACTS_BUCKET = "abstracts";

export async function deleteSubmissionRecord(
  supabase: SupabaseClient,
  submissionId: string | number
): Promise<{ ok: true } | { ok: false; error: string; notFound?: boolean }> {
  const { data: row, error: fetchError } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", submissionId)
    .maybeSingle();

  if (fetchError) {
    return { ok: false, error: fetchError.message };
  }

  if (!row) {
    return { ok: false, error: "Submission not found.", notFound: true };
  }

  const storageKey = submissionStorageObjectPath(row as Record<string, unknown>, ABSTRACTS_BUCKET);
  if (storageKey) {
    const { error: storageError } = await supabase.storage.from(ABSTRACTS_BUCKET).remove([storageKey]);
    if (storageError) {
      console.error("[deleteSubmissionRecord] storage remove failed", storageError);
      return { ok: false, error: storageError.message };
    }
  }

  const { error: deleteError } = await supabase.from("submissions").delete().eq("id", submissionId);

  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  return { ok: true };
}
