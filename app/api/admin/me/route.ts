import { NextResponse } from "next/server";

import { assertAdminFromRequest } from "@/lib/admin-server";

export const dynamic = "force-dynamic";

/** Returns 200 if the bearer token belongs to an admin (bootstrap email or profiles.role = admin). */
export async function GET(request: Request) {
  const auth = await assertAdminFromRequest(request);
  if (!auth.ok) {
    return auth.response;
  }
  return NextResponse.json({ ok: true });
}
