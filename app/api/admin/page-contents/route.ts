import { NextResponse } from "next/server";

import { assertAdminFromRequest, getServiceRoleClient } from "@/lib/admin-server";
import {
  EDITABLE_PAGE_SLUGS,
  isEditablePageSlug,
  type EditablePageSlug,
  type PageContentRow
} from "@/lib/editable-pages";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache"
} as const;

function jsonWithNoStore<T>(body: T, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status,
    headers: NO_STORE_HEADERS
  });
}

function trimOrNull(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    return null;
  }
  const s = value.trim();
  return s === "" ? null : s;
}

export async function GET(request: Request) {
  const auth = await assertAdminFromRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  const supabase = getServiceRoleClient();
  if (!supabase) {
    return jsonWithNoStore({ error: "Server misconfigured" }, { status: 500 });
  }

  const { data, error } = await supabase.from("page_contents").select("*").in("id", [...EDITABLE_PAGE_SLUGS]);

  if (error) {
    return jsonWithNoStore({ error: error.message }, { status: 500 });
  }

  const byId = new Map((data ?? []).map((row) => [(row as PageContentRow).id, row as PageContentRow]));
  const merged: PageContentRow[] = EDITABLE_PAGE_SLUGS.map((id) => {
    const existing = byId.get(id);
    if (existing) {
      return existing;
    }
    return {
      id,
      title_ua: null,
      title_en: null,
      content_ua: null,
      content_en: null,
      updated_at: new Date(0).toISOString()
    };
  });

  return jsonWithNoStore({ pages: merged });
}

type PutBody = {
  id?: unknown;
  title_ua?: unknown;
  title_en?: unknown;
  content_ua?: unknown;
  content_en?: unknown;
};

export async function PUT(request: Request) {
  const auth = await assertAdminFromRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  let body: PutBody;
  try {
    body = (await request.json()) as PutBody;
  } catch {
    return jsonWithNoStore({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!isEditablePageSlug(id)) {
    return jsonWithNoStore({ error: "Invalid page id" }, { status: 400 });
  }

  const row = {
    id: id as EditablePageSlug,
    title_ua: trimOrNull(body.title_ua),
    title_en: trimOrNull(body.title_en),
    content_ua: trimOrNull(body.content_ua),
    content_en: trimOrNull(body.content_en)
  };

  const supabase = getServiceRoleClient();
  if (!supabase) {
    return jsonWithNoStore({ error: "Server misconfigured" }, { status: 500 });
  }

  const { data, error } = await supabase.from("page_contents").upsert(row, { onConflict: "id" }).select("*").single();

  if (error) {
    return jsonWithNoStore({ error: error.message }, { status: 500 });
  }

  return jsonWithNoStore({ page: data as PageContentRow });
}
