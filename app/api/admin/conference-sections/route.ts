import { NextResponse } from "next/server";

import {
  isConferenceSectionsTableMissing,
  isMissingConferenceSectionsSlugColumn
} from "@/lib/admin-db-compat";
import { assertAdminFromRequest, getServiceRoleClient } from "@/lib/admin-server";
import {
  CONFERENCE_SECTION_SELECT_FULL,
  CONFERENCE_SECTION_SELECT_NO_SLUG,
  type ConferenceSectionRow
} from "@/lib/conference-sections";

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function GET(request: Request) {
  const auth = await assertAdminFromRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  const supabase = getServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  let data: ConferenceSectionRow[] | null = null;
  let error = null as { message?: string } | null;

  const attempt = await supabase
    .from("conference_sections")
    .select(CONFERENCE_SECTION_SELECT_FULL)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (attempt.error && isConferenceSectionsTableMissing(attempt.error)) {
    return NextResponse.json({ sections: [] as ConferenceSectionRow[] });
  }

  if (attempt.error && isMissingConferenceSectionsSlugColumn(attempt.error)) {
    const second = await supabase
      .from("conference_sections")
      .select(CONFERENCE_SECTION_SELECT_NO_SLUG)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    data = (second.data ?? []).map((row) => ({ ...row, slug: null })) as ConferenceSectionRow[];
    error = second.error;
  } else {
    data = attempt.data as ConferenceSectionRow[] | null;
    error = attempt.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sections: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await assertAdminFromRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const label_en = (body as { label_en?: unknown }).label_en;
  const label_ua = (body as { label_ua?: unknown }).label_ua;
  const sort_order_raw = (body as { sort_order?: unknown }).sort_order;

  if (!isNonEmptyString(label_en) || !isNonEmptyString(label_ua)) {
    return NextResponse.json({ error: "label_en and label_ua are required." }, { status: 400 });
  }

  const supabase = getServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  let sort_order: number;
  if (typeof sort_order_raw === "number" && Number.isFinite(sort_order_raw)) {
    sort_order = Math.round(sort_order_raw);
  } else {
    const { data: maxRow } = await supabase
      .from("conference_sections")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    sort_order = (maxRow?.sort_order ?? 0) + 1;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("conference_sections")
    .insert({
      sort_order,
      label_en: label_en.trim(),
      label_ua: label_ua.trim()
    })
    .select(CONFERENCE_SECTION_SELECT_FULL)
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ section: inserted as ConferenceSectionRow });
}
