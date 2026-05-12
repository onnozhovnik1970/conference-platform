import { NextResponse } from "next/server";

import { assertAdminFromRequest, getServiceRoleClient } from "@/lib/admin-server";
import type { ConferenceSectionRow } from "@/lib/conference-sections";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await assertAdminFromRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const rawId = id?.trim() ?? "";
  if (!UUID_RE.test(rawId)) {
    return NextResponse.json({ error: "Invalid section id" }, { status: 400 });
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

  const patch: Record<string, unknown> = {};
  if (label_en !== undefined) {
    if (!isNonEmptyString(label_en)) {
      return NextResponse.json({ error: "label_en must be a non-empty string" }, { status: 400 });
    }
    patch.label_en = label_en.trim();
  }
  if (label_ua !== undefined) {
    if (!isNonEmptyString(label_ua)) {
      return NextResponse.json({ error: "label_ua must be a non-empty string" }, { status: 400 });
    }
    patch.label_ua = label_ua.trim();
  }
  if (sort_order_raw !== undefined) {
    if (typeof sort_order_raw !== "number" || !Number.isFinite(sort_order_raw)) {
      return NextResponse.json({ error: "sort_order must be a number" }, { status: 400 });
    }
    patch.sort_order = Math.round(sort_order_raw);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const supabase = getServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { data: updated, error: updateError } = await supabase
    .from("conference_sections")
    .update(patch)
    .eq("id", rawId)
    .select("id, sort_order, slug, label_en, label_ua, created_at")
    .maybeSingle();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }

  return NextResponse.json({ section: updated as ConferenceSectionRow });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await assertAdminFromRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const rawId = id?.trim() ?? "";
  if (!UUID_RE.test(rawId)) {
    return NextResponse.json({ error: "Invalid section id" }, { status: 400 });
  }

  const supabase = getServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { error: deleteError } = await supabase.from("conference_sections").delete().eq("id", rawId);

  if (deleteError) {
    if (deleteError.code === "23503") {
      return NextResponse.json(
        { error: "This section is still used by submissions. Reassign or remove those submissions first." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
