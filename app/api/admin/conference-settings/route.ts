import { NextResponse } from "next/server";

import { assertAdminFromRequest, getServiceRoleClient } from "@/lib/admin-server";
import { DEFAULT_CONFERENCE_SETTINGS, type ConferenceSettingsRow } from "@/lib/conference-settings";

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

type PatchBody = {
  title?: unknown;
  title_ua?: unknown;
  date?: unknown;
  deadline?: unknown;
  location?: unknown;
  description?: unknown;
  description_ua?: unknown;
  zoom_link?: unknown;
  zoom_details?: unknown;
  plenary_start_time?: unknown;
  meta_title?: unknown;
  meta_description?: unknown;
};

function asOptionalDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

function readOptionalPlenaryStartTime(body: PatchBody): string | null | "invalid" | undefined {
  if (!("plenary_start_time" in body)) {
    return undefined;
  }
  const v = body.plenary_start_time;
  if (v === null || v === undefined || v === "") {
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

function asOptionalText(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string") {
    return null;
  }
  return value;
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
    .from("conference_settings")
    .select(
      "id, title, title_ua, date, plenary_start_time, deadline, location, description, description_ua, zoom_link, zoom_details, meta_title, meta_description, updated_at"
    )
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return jsonWithNoStore({
      settings: { ...DEFAULT_CONFERENCE_SETTINGS, updated_at: new Date().toISOString() } satisfies ConferenceSettingsRow
    });
  }

  return jsonWithNoStore({ settings: data as ConferenceSettingsRow });
}

export async function PATCH(request: Request) {
  const auth = await assertAdminFromRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const titleRaw = asOptionalText(body.title);
  if (titleRaw === null || !titleRaw.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const title_ua = asOptionalText(body.title_ua);

  const date = asOptionalDate(body.date);
  const deadline = asOptionalDate(body.deadline);
  const location = asOptionalText(body.location);
  const description = asOptionalText(body.description);
  const description_ua = asOptionalText(body.description_ua);
  const zoom_link = asOptionalText(body.zoom_link);
  const zoom_details = asOptionalText(body.zoom_details);

  const meta_title_in = "meta_title" in body ? asOptionalText(body.meta_title) : undefined;
  const meta_description_in = "meta_description" in body ? asOptionalText(body.meta_description) : undefined;

  const plenary_start_time_parsed = readOptionalPlenaryStartTime(body);
  if (plenary_start_time_parsed === "invalid") {
    return NextResponse.json({ error: "plenary_start_time must be an ISO date string or null" }, { status: 400 });
  }

  const supabase = getServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const selectCols =
    "id, title, title_ua, date, plenary_start_time, deadline, location, description, description_ua, zoom_link, zoom_details, meta_title, meta_description, updated_at";

  const values = {
    title: titleRaw.trim(),
    title_ua: title_ua?.trim() ?? null,
    date,
    deadline,
    location: location?.trim() ?? null,
    description: description?.trim() ?? null,
    description_ua: description_ua?.trim() ?? null,
    zoom_link: zoom_link?.trim() ?? null,
    zoom_details: zoom_details?.trim() ?? null,
    ...(plenary_start_time_parsed !== undefined ? { plenary_start_time: plenary_start_time_parsed } : {}),
    ...(meta_title_in !== undefined ? { meta_title: meta_title_in?.trim() ? meta_title_in.trim() : null } : {}),
    ...(meta_description_in !== undefined
      ? { meta_description: meta_description_in?.trim() ? meta_description_in.trim() : null }
      : {})
  };

  const { data: updated, error: updateErr } = await supabase
    .from("conference_settings")
    .update(values)
    .eq("id", 1)
    .select(selectCols)
    .maybeSingle();

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  if (updated) {
    return jsonWithNoStore({ settings: updated as ConferenceSettingsRow });
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("conference_settings")
    .insert({ id: 1, ...values })
    .select(selectCols)
    .maybeSingle();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  if (!inserted) {
    return NextResponse.json({ error: "Save did not return a conference_settings row." }, { status: 500 });
  }

  return jsonWithNoStore({ settings: inserted as ConferenceSettingsRow });
}
