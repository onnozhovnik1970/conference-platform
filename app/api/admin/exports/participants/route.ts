import { NextResponse } from "next/server";

import { assertAdminFromRequest, getServiceRoleClient, isBootstrapAdminEmail } from "@/lib/admin-server";

export const dynamic = "force-dynamic";

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  institution: string | null;
  role: string | null;
};

function escapeCsvCell(value: string): string {
  const v = value.replace(/\r?\n/g, " ").replace(/\r/g, "");
  if (/[",]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
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

  const { data: listData, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 });
  }

  const authUsers = listData?.users ?? [];
  const ids = authUsers.map((u) => u.id).filter(Boolean);

  let profilesById: Record<string, ProfileRow> = {};
  if (ids.length > 0) {
    const { data: profs, error: pErr } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, middle_name, institution, role")
      .in("id", ids);

    if (pErr) {
      return NextResponse.json({ error: pErr.message }, { status: 500 });
    }
    profilesById = Object.fromEntries((profs ?? []).map((p) => [p.id as string, p as ProfileRow]));
  }

  const header = ["Full name", "Email", "Role", "Affiliation", "Registration date"];
  const lines: string[] = [header.map(escapeCsvCell).join(",")];

  for (const u of authUsers) {
    const prof = profilesById[u.id];
    const storedRole = prof?.role === "admin" ? "admin" : "user";
    const bootstrap = isBootstrapAdminEmail(u.email ?? undefined);
    const effectiveRole = storedRole === "admin" || bootstrap ? "admin" : "user";
    const parts = [prof?.last_name, prof?.first_name, prof?.middle_name].filter(
      (x): x is string => typeof x === "string" && Boolean(x.trim())
    );
    const fullName = parts.join(" ").trim() || "—";
    const affiliation = (prof?.institution ?? "").trim() || "—";
    const email = (u.email ?? "").trim() || "—";
    const created = u.created_at ? new Date(u.created_at).toISOString() : "";

    lines.push(
      [
        escapeCsvCell(fullName),
        escapeCsvCell(email),
        escapeCsvCell(effectiveRole),
        escapeCsvCell(affiliation),
        escapeCsvCell(created)
      ].join(",")
    );
  }

  const csv = `\uFEFF${lines.join("\r\n")}`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="conference-participants.csv"',
      "Cache-Control": "no-store"
    }
  });
}
