import { NextResponse } from "next/server";

import { DEFAULT_CONFERENCE_SETTINGS, type ConferenceSettingsRow } from "@/lib/conference-settings";
import { getServiceRoleClient } from "@/lib/admin-server";

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

export async function GET() {
  const supabase = getServiceRoleClient();
  if (!supabase) {
    return jsonWithNoStore({
      settings: { ...DEFAULT_CONFERENCE_SETTINGS, updated_at: new Date().toISOString() } satisfies ConferenceSettingsRow
    });
  }

  const { data, error } = await supabase.from("conference_settings").select("id, title, date, deadline, location, description, updated_at").eq("id", 1).maybeSingle();

  if (error || !data) {
    return jsonWithNoStore({
      settings: { ...DEFAULT_CONFERENCE_SETTINGS, updated_at: new Date().toISOString() } satisfies ConferenceSettingsRow
    });
  }

  return jsonWithNoStore({ settings: data as ConferenceSettingsRow });
}
