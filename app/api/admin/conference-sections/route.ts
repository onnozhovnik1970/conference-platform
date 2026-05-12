import { NextResponse } from "next/server";

import { assertAdminFromRequest, getServiceRoleClient } from "@/lib/admin-server";
import type { ConferenceSectionRow } from "@/lib/conference-sections";

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

  const { data, error } = await supabase
    .from("conference_sections")
    .select("id, sort_order, slug, label_en, label_ua, created_at")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sections: (data ?? []) as ConferenceSectionRow[] });
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
    .select("id, sort_order, slug, label_en, label_ua, created_at")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ section: inserted as ConferenceSectionRow });
}
