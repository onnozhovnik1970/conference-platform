import { NextResponse } from "next/server";

import { DEFAULT_CONFERENCE_SETTINGS, type ConferenceSettingsRow } from "@/lib/conference-settings";
import { getServiceRoleClient } from "@/lib/admin-server";

export async function GET() {
  const supabase = getServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { settings: { ...DEFAULT_CONFERENCE_SETTINGS, updated_at: new Date().toISOString() } satisfies ConferenceSettingsRow },
      { status: 200 }
    );
  }

  const { data, error } = await supabase.from("conference_settings").select("id, title, date, deadline, location, description, updated_at").eq("id", 1).maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { settings: { ...DEFAULT_CONFERENCE_SETTINGS, updated_at: new Date().toISOString() } satisfies ConferenceSettingsRow },
      { status: 200 }
    );
  }

  return NextResponse.json({ settings: data as ConferenceSettingsRow });
}
