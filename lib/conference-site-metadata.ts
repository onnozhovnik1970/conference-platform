import { getServiceRoleClient } from "@/lib/admin-server";
import { DEFAULT_SITE_META_DESCRIPTION, DEFAULT_SITE_META_TITLE } from "@/lib/site-default-metadata";

export type ConferencePageMetadata = {
  title: string;
  description: string;
};

/**
 * Reads `conference_settings.meta_title` / `meta_description` for the root document.
 * Uses defaults when Supabase is unavailable, the row is missing, or the fields are blank.
 */
export async function getConferencePageMetadata(): Promise<ConferencePageMetadata> {
  const supabase = getServiceRoleClient();
  if (!supabase) {
    return { title: DEFAULT_SITE_META_TITLE, description: DEFAULT_SITE_META_DESCRIPTION };
  }

  const { data, error } = await supabase
    .from("conference_settings")
    .select("meta_title, meta_description")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    return { title: DEFAULT_SITE_META_TITLE, description: DEFAULT_SITE_META_DESCRIPTION };
  }

  const rawTitle = typeof data.meta_title === "string" ? data.meta_title.trim() : "";
  const rawDesc = typeof data.meta_description === "string" ? data.meta_description.trim() : "";

  return {
    title: rawTitle || DEFAULT_SITE_META_TITLE,
    description: rawDesc || DEFAULT_SITE_META_DESCRIPTION
  };
}
