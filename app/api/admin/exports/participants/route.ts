import { NextResponse } from "next/server";

import {
  isConferenceSectionsTableMissing,
  isMissingConferenceSectionsSlugColumn,
  isMissingSubmissionsSectionIdColumn
} from "@/lib/admin-db-compat";
import { assertAdminFromRequest, getServiceRoleClient, isBootstrapAdminEmail } from "@/lib/admin-server";
import {
  CONFERENCE_SECTION_SELECT_FULL,
  CONFERENCE_SECTION_SELECT_NO_SLUG,
  type ConferenceSectionRow
} from "@/lib/conference-sections";

export const dynamic = "force-dynamic";

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  institution: string | null;
  role: string | null;
};

type SubmissionExportRow = {
  user_id: string;
  abstract_title: string | null;
  thematic_panel: string | null;
  section_id: string | null;
  created_at: string;
};

function escapeCsvCell(value: string): string {
  const v = value.replace(/\r?\n/g, " ").replace(/\r/g, "");
  if (/[",]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function formatSectionLabel(sec: Pick<ConferenceSectionRow, "label_en" | "label_ua">): string {
  const en = (sec.label_en ?? "").trim();
  const ua = (sec.label_ua ?? "").trim();
  if (en && ua && en !== ua) {
    return `${en} / ${ua}`;
  }
  return en || ua;
}

function resolveSubmissionSection(
  row: Pick<SubmissionExportRow, "section_id" | "thematic_panel">,
  byId: Map<string, ConferenceSectionRow>,
  bySlug: Map<string, ConferenceSectionRow>,
  byLabelEnLower: Map<string, ConferenceSectionRow>
): string {
  const sid = typeof row.section_id === "string" ? row.section_id.trim() : "";
  if (sid) {
    const sec = byId.get(sid);
    if (sec) {
      return formatSectionLabel(sec);
    }
  }
  const tp = (row.thematic_panel ?? "").trim();
  if (!tp) {
    return "";
  }
  const bySlugHit = bySlug.get(tp);
  if (bySlugHit) {
    return formatSectionLabel(bySlugHit);
  }
  const byLabelHit = byLabelEnLower.get(tp.toLowerCase());
  if (byLabelHit) {
    return formatSectionLabel(byLabelHit);
  }
  return tp;
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
  const ids = authUsers.map((u) => u.id).filter(Boolean) as string[];

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

  let sections: ConferenceSectionRow[] = [];
  const secFirst = await supabase.from("conference_sections").select(CONFERENCE_SECTION_SELECT_FULL).order("sort_order", { ascending: true });
  if (secFirst.error && isConferenceSectionsTableMissing(secFirst.error)) {
    sections = [];
  } else if (secFirst.error && isMissingConferenceSectionsSlugColumn(secFirst.error)) {
    const secSecond = await supabase
      .from("conference_sections")
      .select(CONFERENCE_SECTION_SELECT_NO_SLUG)
      .order("sort_order", { ascending: true });
    if (!secSecond.error) {
      sections = (secSecond.data ?? []).map((r) => ({ ...r, slug: null })) as ConferenceSectionRow[];
    }
  } else if (secFirst.error) {
    return NextResponse.json({ error: secFirst.error.message }, { status: 500 });
  } else {
    sections = (secFirst.data ?? []) as ConferenceSectionRow[];
  }

  const byId = new Map<string, ConferenceSectionRow>();
  const bySlug = new Map<string, ConferenceSectionRow>();
  const byLabelEnLower = new Map<string, ConferenceSectionRow>();
  for (const s of sections) {
    byId.set(s.id, s);
    const slug = (s.slug ?? "").trim();
    if (slug) {
      bySlug.set(slug, s);
    }
    const le = (s.label_en ?? "").trim().toLowerCase();
    if (le) {
      byLabelEnLower.set(le, s);
    }
  }

  const latestSubmissionByUserId = new Map<string, SubmissionExportRow>();
  if (ids.length > 0) {
    const selectWithSection = "user_id, abstract_title, thematic_panel, section_id, created_at";
    const selectWithoutSection = "user_id, abstract_title, thematic_panel, created_at";

    const first = await supabase
      .from("submissions")
      .select(selectWithSection)
      .in("user_id", ids)
      .order("created_at", { ascending: false });

    let rows: Record<string, unknown>[] = [];
    if (first.error && isMissingSubmissionsSectionIdColumn(first.error)) {
      const second = await supabase
        .from("submissions")
        .select(selectWithoutSection)
        .in("user_id", ids)
        .order("created_at", { ascending: false });
      if (second.error) {
        return NextResponse.json({ error: second.error.message }, { status: 500 });
      }
      rows = (second.data ?? []).map((r) => ({ ...r, section_id: null }));
    } else if (first.error) {
      return NextResponse.json({ error: first.error.message }, { status: 500 });
    } else {
      rows = first.data ?? [];
    }

    for (const raw of rows) {
      const row = raw as SubmissionExportRow;
      const uid = row.user_id;
      if (!uid || latestSubmissionByUserId.has(uid)) {
        continue;
      }
      latestSubmissionByUserId.set(uid, row);
    }
  }

  const header = ["Full name", "Email", "Role", "Affiliation", "Registration date", "Section", "Paper Title"];
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

    const sub = latestSubmissionByUserId.get(u.id);
    const sectionCell = sub ? resolveSubmissionSection(sub, byId, bySlug, byLabelEnLower) : "";
    const titleCell = sub ? (sub.abstract_title ?? "").trim() : "";

    lines.push(
      [
        escapeCsvCell(fullName),
        escapeCsvCell(email),
        escapeCsvCell(effectiveRole),
        escapeCsvCell(affiliation),
        escapeCsvCell(created),
        escapeCsvCell(sectionCell),
        escapeCsvCell(titleCell)
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
