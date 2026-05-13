import { NextResponse } from "next/server";

import { assertAdminFromRequest, getServiceRoleClient } from "@/lib/admin-server";
import { CONFERENCE_SECTION_SELECT_FULL, type ConferenceSectionRow } from "@/lib/conference-sections";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function readOptionalNullableText(
  body: Record<string, unknown>,
  key: string
): { ok: true; value: string | null } | { ok: false } | { ok: "omit" } {
  if (!(key in body)) {
    return { ok: "omit" };
  }
  const v = body[key];
  if (v === null) {
    return { ok: true, value: null };
  }
  if (typeof v !== "string") {
    return { ok: false };
  }
  const t = v.trim();
  return { ok: true, value: t === "" ? null : t };
}

function readOptionalStartTime(body: Record<string, unknown>, key: string): string | null | undefined | "invalid" {
  if (!(key in body)) {
    return undefined;
  }
  const v = body[key];
  if (v === null) {
    return null;
  }
  if (typeof v !== "string") {
    return "invalid";
  }
  const t = v.trim();
  if (t === "") {
    return null;
  }
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) {
    return "invalid";
  }
  return d.toISOString();
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

  const b = body as Record<string, unknown>;
  const label_en = b.label_en;
  const label_ua = b.label_ua;
  const sort_order_raw = b.sort_order;

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

  const zoom_link = readOptionalNullableText(b, "zoom_link");
  if (zoom_link.ok === false) {
    return NextResponse.json({ error: "zoom_link must be a string or null" }, { status: 400 });
  }
  if (zoom_link.ok === true) {
    patch.zoom_link = zoom_link.value;
  }

  const zoom_meeting_id = readOptionalNullableText(b, "zoom_meeting_id");
  if (zoom_meeting_id.ok === false) {
    return NextResponse.json({ error: "zoom_meeting_id must be a string or null" }, { status: 400 });
  }
  if (zoom_meeting_id.ok === true) {
    patch.zoom_meeting_id = zoom_meeting_id.value;
  }

  const zoom_password = readOptionalNullableText(b, "zoom_password");
  if (zoom_password.ok === false) {
    return NextResponse.json({ error: "zoom_password must be a string or null" }, { status: 400 });
  }
  if (zoom_password.ok === true) {
    patch.zoom_password = zoom_password.value;
  }

  const start_time = readOptionalStartTime(b, "start_time");
  if (start_time === "invalid") {
    return NextResponse.json({ error: "start_time must be an ISO date string or null" }, { status: 400 });
  }
  if (start_time !== undefined) {
    patch.start_time = start_time;
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
    .select(CONFERENCE_SECTION_SELECT_FULL)
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
