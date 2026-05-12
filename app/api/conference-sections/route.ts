import { NextResponse } from "next/server";

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

  const { data, error } = await supabase
    .from("conference_sections")
    .select("id, sort_order, slug, label_en, label_ua, created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });
  }

  return NextResponse.json({ sections: (data ?? []) as ConferenceSectionRow[] }, { headers: NO_STORE_HEADERS });
}
