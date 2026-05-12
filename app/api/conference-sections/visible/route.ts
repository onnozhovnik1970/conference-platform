import { NextResponse } from "next/server";

import type { ConferenceSectionRow } from "@/lib/conference-sections";
import { getServiceRoleClient } from "@/lib/admin-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache"
} as const;

/**
 * Sections that have at least one non-archived accepted submission (by section_id or legacy thematic_panel slug).
 */
export async function GET() {
  const supabase = getServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ sections: [] as ConferenceSectionRow[] }, { headers: NO_STORE_HEADERS });
  }

  const [{ data: sections, error: sectionsError }, { data: acceptedRows, error: accError }] = await Promise.all([
    supabase.from("conference_sections").select("id, sort_order, slug, label_en, label_ua, created_at"),
    supabase.from("submissions").select("section_id, thematic_panel").eq("status", "accepted").is("archived_at", null)
  ]);

  if (sectionsError) {
    return NextResponse.json({ error: sectionsError.message }, { status: 500, headers: NO_STORE_HEADERS });
  }
  if (accError) {
    return NextResponse.json({ error: accError.message }, { status: 500, headers: NO_STORE_HEADERS });
  }

  const slugToId = new Map<string, string>();
  for (const s of sections ?? []) {
    if (s.slug) {
      slugToId.set(String(s.slug).trim(), s.id);
    }
  }

  const visibleIds = new Set<string>();
  for (const row of acceptedRows ?? []) {
    const sid = row.section_id as string | null;
    if (sid) {
      visibleIds.add(sid);
      continue;
    }
    const tp = typeof row.thematic_panel === "string" ? row.thematic_panel.trim() : "";
    const mapped = tp ? slugToId.get(tp) : undefined;
    if (mapped) {
      visibleIds.add(mapped);
    }
  }

  const list = (sections ?? [])
    .filter((s) => visibleIds.has(s.id))
    .sort((a, b) => a.sort_order - b.sort_order || new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return NextResponse.json({ sections: list as ConferenceSectionRow[] }, { headers: NO_STORE_HEADERS });
}
