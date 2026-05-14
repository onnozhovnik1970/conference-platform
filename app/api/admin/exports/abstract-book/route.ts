import { NextResponse } from "next/server";

import {
  authorDisplayNameFromProfile,
  loadAcceptedSubmissionsForDocuments,
  type AcceptedSubmissionExportRow,
  type ProfileExportMini
} from "@/lib/admin/accepted-submissions-for-documents";
import { renderAbstractBookPdfBuffer } from "@/lib/admin/render-abstract-book-pdf";
import { assertAdminFromRequest, getServiceRoleClient } from "@/lib/admin-server";
import { formatConferenceIsoDate } from "@/lib/conference-dates";
import { DEFAULT_CONFERENCE_SETTINGS, type ConferenceSettingsRow } from "@/lib/conference-settings";

export const dynamic = "force-dynamic";

/** No server-side PDF text extraction (avoids pdfjs / canvas on Vercel). */
const ABSTRACT_BOOK_BODY_NOTE = "Full text: see uploaded file";

function submissionRecencyMs(row: Record<string, unknown>): number {
  let best = 0;
  for (const key of ["updated_at", "created_at", "status_updated_at"] as const) {
    const v = row[key];
    if (typeof v === "string" && v.trim()) {
      const t = Date.parse(v);
      if (!Number.isNaN(t)) {
        best = Math.max(best, t);
      }
    }
  }
  return best;
}

/** One row per user: the accepted submission with the latest activity timestamps. */
function pickLatestSubmissionPerUser(rows: AcceptedSubmissionExportRow[]): AcceptedSubmissionExportRow[] {
  const sorted = [...rows].sort((a, b) => {
    const diff = submissionRecencyMs(b) - submissionRecencyMs(a);
    if (diff !== 0) {
      return diff;
    }
    return String(b.id ?? "").localeCompare(String(a.id ?? ""));
  });
  const seen = new Set<string>();
  const out: AcceptedSubmissionExportRow[] = [];
  for (const row of sorted) {
    const uid = String(row.user_id);
    if (!uid || seen.has(uid)) {
      continue;
    }
    seen.add(uid);
    out.push(row);
  }
  return out;
}

function isPlaceholderDisplayText(s: string): boolean {
  const t = s.trim();
  if (!t) {
    return true;
  }
  return t === "—" || t === "–" || t === "-";
}

function rawAbstractTitle(sub: AcceptedSubmissionExportRow): string {
  return typeof sub.abstract_title === "string" ? sub.abstract_title : "";
}

/** Drop rows that look like empty test stubs (no real title and no real author name). */
function shouldSkipTestLikeAbstractBookEntry(
  sub: AcceptedSubmissionExportRow,
  prof: ProfileExportMini | undefined
): boolean {
  const titleBad = isPlaceholderDisplayText(rawAbstractTitle(sub));
  const authorBad = isPlaceholderDisplayText(authorDisplayNameFromProfile(prof));
  return titleBad && authorBad;
}

function logAbstractBookFatal(context: string, e: unknown) {
  if (e instanceof Error) {
    console.error(`[admin export abstract-book] ${context}`, {
      name: e.name,
      message: e.message,
      stack: e.stack,
      cause: e.cause
    });
    console.error(`[admin export abstract-book] ${context} (raw Error)`, e);
  } else {
    console.error(`[admin export abstract-book] ${context} (non-Error)`, e);
  }
}

export async function GET(request: Request) {
  try {
    const auth = await assertAdminFromRequest(request);
    if (!auth.ok) {
      return auth.response;
    }

    const supabase = getServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const loaded = await loadAcceptedSubmissionsForDocuments(supabase);
    if ("error" in loaded) {
      return NextResponse.json({ error: loaded.error }, { status: 500 });
    }

    const { submissions, profilesById } = loaded;
    const onePerUser = pickLatestSubmissionPerUser(submissions);
    const forBook = onePerUser.filter(
      (sub) => !shouldSkipTestLikeAbstractBookEntry(sub, profilesById[String(sub.user_id)])
    );
    const sorted = [...forBook].sort((a, b) => {
      const pa = profilesById[String(a.user_id)];
      const pb = profilesById[String(b.user_id)];
      const la = (pa?.last_name ?? "").trim().toLowerCase();
      const lb = (pb?.last_name ?? "").trim().toLowerCase();
      const c = la.localeCompare(lb, undefined, { sensitivity: "base" });
      if (c !== 0) {
        return c;
      }
      const fa = (pa?.first_name ?? "").trim().toLowerCase();
      const fb = (pb?.first_name ?? "").trim().toLowerCase();
      return fa.localeCompare(fb, undefined, { sensitivity: "base" });
    });

    const entries = sorted.map((sub, idx) => {
      const prof = profilesById[String(sub.user_id)];
      const author = authorDisplayNameFromProfile(prof);
      const title = (typeof sub.abstract_title === "string" ? sub.abstract_title : "").trim() || "—";
      const inst = (prof?.institution ?? "").trim();
      const country = (typeof sub.country === "string" ? sub.country : "").trim();
      const aff = inst && country ? `${inst}, ${country}` : inst || country || "—";
      return {
        displayNumber: idx + 1,
        authorFullName: author,
        titleAllCaps: title.toLocaleUpperCase("uk-UA"),
        affiliationItalic: aff,
        bodyText: ABSTRACT_BOOK_BODY_NOTE
      };
    });

    const { data: settingsRow } = await supabase
      .from("conference_settings")
      .select("title, date, location")
      .eq("id", 1)
      .maybeSingle();

    const settings = { ...DEFAULT_CONFERENCE_SETTINGS, ...(settingsRow ?? {}) } as ConferenceSettingsRow;
    const conferenceTitle = (settings.title ?? DEFAULT_CONFERENCE_SETTINGS.title).trim();
    const dateLine = formatConferenceIsoDate(settings.date, "en");
    const cityLine = (settings.location ?? "").trim();

    const pdf = await renderAbstractBookPdfBuffer(conferenceTitle, dateLine, cityLine, entries);
    const safeName = "abstract-book.pdf";
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (e: unknown) {
    logAbstractBookFatal("GET failed", e);
    const message = e instanceof Error ? e.message : "Abstract book export failed";
    const detail = process.env.NODE_ENV === "development" ? message : undefined;
    return NextResponse.json({ error: "Abstract book export failed", detail }, { status: 500 });
  }
}
