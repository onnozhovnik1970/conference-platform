import type { SupabaseClient } from "@supabase/supabase-js";

/** Distinct `user_id`s with at least one accepted, non-archived submission (latest submission wins for ordering only). */
export async function listAcceptedAuthorUserIds(supabase: SupabaseClient): Promise<string[]> {
  const { data: submissionRows, error } = await supabase
    .from("submissions")
    .select("user_id, created_at")
    .eq("status", "accepted")
    .is("archived_at", null);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (submissionRows ?? []) as { user_id: string; created_at: string }[];
  const sorted = [...rows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const row of sorted) {
    if (row.user_id && !seen.has(row.user_id)) {
      seen.add(row.user_id);
      ids.push(row.user_id);
    }
  }
  return ids;
}
