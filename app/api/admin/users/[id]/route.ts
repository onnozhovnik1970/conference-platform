import { NextResponse } from "next/server";

import { assertAdminFromRequest, getServiceRoleClient, isBootstrapAdminEmail } from "@/lib/admin-server";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PatchBody = {
  role?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  middleName?: unknown;
  institution?: unknown;
};

function parseProfileFields(body: PatchBody): {
  ok: true;
  firstName: string;
  lastName: string;
  middleName: string | null;
  institution: string;
} | { ok: false; error: string } {
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const institution = typeof body.institution === "string" ? body.institution.trim() : "";
  const rawMiddle = body.middleName;
  const middleName =
    rawMiddle === null || rawMiddle === undefined
      ? null
      : typeof rawMiddle === "string"
        ? rawMiddle.trim() || null
        : null;

  if (!firstName || !lastName || !institution) {
    return { ok: false, error: "firstName, lastName, and institution are required and cannot be empty." };
  }

  return { ok: true, firstName, lastName, middleName, institution };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await assertAdminFromRequest(request);
  if (!auth.ok) {
    return auth.response;
  }

  const { id: rawId } = await params;
  const targetId = rawId?.trim() ?? "";
  if (!UUID_RE.test(targetId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const roleRaw = body.role;
  const hasRole = roleRaw === "user" || roleRaw === "admin";

  const profileKeysPresent =
    "firstName" in body || "lastName" in body || "middleName" in body || "institution" in body;

  if (!hasRole && !profileKeysPresent) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  let profileFields: ReturnType<typeof parseProfileFields> | null = null;
  if (profileKeysPresent) {
    const parsed = parseProfileFields(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    profileFields = parsed;
  }

  const supabase = getServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { data: targetAuth, error: getUserErr } = await supabase.auth.admin.getUserById(targetId);
  if (getUserErr || !targetAuth?.user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const targetEmail = targetAuth.user.email;

  if (hasRole && roleRaw === "user" && isBootstrapAdminEmail(targetEmail)) {
    return NextResponse.json(
      {
        error:
          "Cannot demote bootstrap admin accounts from the UI. Remove the email from ALLOWED_ADMIN_EMAILS in the codebase or update the database role after changing that list."
      },
      { status: 400 }
    );
  }

  const { data: existing } = await supabase.from("profiles").select("id, role").eq("id", targetId).maybeSingle();

  const profileUpdate: Record<string, string | null> = {};
  if (profileFields) {
    profileUpdate.first_name = profileFields.firstName;
    profileUpdate.last_name = profileFields.lastName;
    profileUpdate.middle_name = profileFields.middleName;
    profileUpdate.institution = profileFields.institution;
  }

  if (hasRole) {
    profileUpdate.role = roleRaw as string;
  }

  if (existing) {
    const { error: upErr } = await supabase.from("profiles").update(profileUpdate).eq("id", targetId);
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }
  } else {
    const roleToInsert = hasRole ? (roleRaw as "user" | "admin") : "user";
    const insertRow = {
      id: targetId,
      last_name: profileFields?.lastName ?? "—",
      first_name: profileFields?.firstName ?? "—",
      middle_name: profileFields?.middleName ?? null,
      institution: profileFields?.institution ?? "—",
      role: roleToInsert
    };
    if (!profileFields && !hasRole) {
      return NextResponse.json({ error: "Invalid update" }, { status: 400 });
    }
    if (!profileFields && hasRole) {
      const { error: insErr } = await supabase.from("profiles").insert({
        id: targetId,
        last_name: "—",
        first_name: "—",
        middle_name: null,
        institution: "—",
        role: roleToInsert
      });
      if (insErr) {
        return NextResponse.json({ error: insErr.message }, { status: 500 });
      }
    } else {
      const { error: insErr } = await supabase.from("profiles").insert(insertRow);
      if (insErr) {
        return NextResponse.json({ error: insErr.message }, { status: 500 });
      }
    }
  }

  if (profileFields && targetEmail) {
    const normEmail = targetEmail.trim().toLowerCase();
    const { error: partErr } = await supabase
      .from("participants")
      .update({
        first_name: profileFields.firstName,
        last_name: profileFields.lastName,
        middle_name: profileFields.middleName,
        institution: profileFields.institution
      })
      .eq("email", normEmail);

    if (partErr) {
      return NextResponse.json({ error: `Could not sync participants row: ${partErr.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, role: hasRole ? roleRaw : undefined });
}
