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

export function isBootstrapAdminEmail(email: string | undefined): boolean {
  if (!email) {
    return false;
  }
  return adminEmailSet.has(email.trim().toLowerCase());
}

export async function userHasAdminAccess(supabase: NonNullable<ReturnType<typeof getServiceRoleClient>>, user: User): Promise<boolean> {
  if (!user.email) {
    return false;
  }
  if (isBootstrapAdminEmail(user.email)) {
    return true;
  }
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return data?.role === "admin";
}

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

  if (!(await userHasAdminAccess(supabase, user))) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { ok: true, user };
}
