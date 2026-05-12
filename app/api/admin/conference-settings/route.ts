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
  date?: unknown;
  deadline?: unknown;
  location?: unknown;
  description?: unknown;
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

  const { data, error } = await supabase.from("conference_settings").select("id, title, date, deadline, location, description, updated_at").eq("id", 1).maybeSingle();

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

  const date = asOptionalDate(body.date);
  const deadline = asOptionalDate(body.deadline);
  const location = asOptionalText(body.location);
  const description = asOptionalText(body.description);

  const supabase = getServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("conference_settings")
    .upsert(
      {
        id: 1,
        title: titleRaw.trim(),
        date,
        deadline,
        location: location?.trim() ?? null,
        description: description?.trim() ?? null
      },
      { onConflict: "id" }
    )
    .select("id, title, date, deadline, location, description, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return jsonWithNoStore({ settings: data });
}
