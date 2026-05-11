import { createClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { ALLOWED_ADMIN_EMAILS } from "@/lib/admin";

function normalizeSupabaseUrl(rawUrl: string): string | null {
  try {
    return new URL(rawUrl.trim()).origin;
  } catch {
    return null;
  }
}

export function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ? normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) {
    return null;
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
}

const adminEmailSet = new Set(ALLOWED_ADMIN_EMAILS.map((email) => email.trim().toLowerCase()).filter(Boolean));

export async function assertAdminFromRequest(request: Request): Promise<
  { ok: true; user: User } | { ok: false; response: NextResponse }
> {
  const supabase = getServiceRoleClient();
  if (!supabase) {
    return { ok: false, response: NextResponse.json({ error: "Server misconfigured" }, { status: 500 }) };
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!token) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const {
    data: { user },
    error
  } = await supabase.auth.getUser(token);

  if (error || !user?.email) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (!adminEmailSet.has(user.email.toLowerCase())) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true, user };
}
