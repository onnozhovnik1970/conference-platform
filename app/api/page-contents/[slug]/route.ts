import { NextResponse } from "next/server";

import { isEditablePageSlug, type PageContentRow } from "@/lib/editable-pages";
import { getServiceRoleClient } from "@/lib/admin-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache"
} as const;

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!isEditablePageSlug(slug)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = getServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { data, error } = await supabase.from("page_contents").select("*").eq("id", slug).maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });
  }

  if (!data) {
    return NextResponse.json(
      {
        page: {
          id: slug,
          title_ua: null,
          title_en: null,
          content_ua: null,
          content_en: null,
          updated_at: new Date(0).toISOString()
        } satisfies PageContentRow
      },
      { headers: NO_STORE_HEADERS }
    );
  }

  return NextResponse.json({ page: data as PageContentRow }, { headers: NO_STORE_HEADERS });
}
