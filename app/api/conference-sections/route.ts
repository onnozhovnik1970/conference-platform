import { NextResponse } from "next/server";

import {
  isConferenceSectionsTableMissing,
  isMissingConferenceSectionsSlugColumn
} from "@/lib/admin-db-compat";
import type { ConferenceSectionRow } from "@/lib/conference-sections";
import { getServiceRoleClient } from "@/lib/admin-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache"
} as const;

export async function GET() {
  const supabase = getServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ sections: [] as ConferenceSectionRow[] }, { headers: NO_STORE_HEADERS });
  }

  const selectFull = "id, sort_order, slug, label_en, label_ua, created_at";
  const selectNoSlug = "id, sort_order, label_en, label_ua, created_at";

  const attempt = await supabase
    .from("conference_sections")
    .select(selectFull)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (attempt.error && isConferenceSectionsTableMissing(attempt.error)) {
    return NextResponse.json({ sections: [] as ConferenceSectionRow[] }, { headers: NO_STORE_HEADERS });
  }

  let list: ConferenceSectionRow[];

  if (attempt.error && isMissingConferenceSectionsSlugColumn(attempt.error)) {
    const second = await supabase
      .from("conference_sections")
      .select(selectNoSlug)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (second.error) {
      return NextResponse.json({ error: second.error.message }, { status: 500, headers: NO_STORE_HEADERS });
    }
    list = (second.data ?? []).map((row) => ({ ...row, slug: null })) as ConferenceSectionRow[];
  } else if (attempt.error) {
    return NextResponse.json({ error: attempt.error.message }, { status: 500, headers: NO_STORE_HEADERS });
  } else {
    list = (attempt.data ?? []) as ConferenceSectionRow[];
  }

  return NextResponse.json({ sections: list }, { headers: NO_STORE_HEADERS });
}
