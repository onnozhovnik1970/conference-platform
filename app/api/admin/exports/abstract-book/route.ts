import { NextResponse } from "next/server";

import {
  authorDisplayNameFromProfile,
  loadAcceptedSubmissionsForDocuments
} from "@/lib/admin/accepted-submissions-for-documents";
import { extractTextFromSubmissionFile } from "@/lib/admin/extract-submission-file-text";
import { fileExtensionFromPath } from "@/lib/admin/export-filename";
import { submissionStorageObjectPath } from "@/lib/admin/submission-storage-path";
import { renderAbstractBookPdfBuffer } from "@/lib/admin/render-abstract-book-pdf";
import { assertAdminFromRequest, getServiceRoleClient } from "@/lib/admin-server";
import { formatConferenceIsoDate } from "@/lib/conference-dates";
import { DEFAULT_CONFERENCE_SETTINGS, type ConferenceSettingsRow } from "@/lib/conference-settings";

export const dynamic = "force-dynamic";

const ABSTRACTS_BUCKET = "abstracts";

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
    const sorted = [...submissions].sort((a, b) => {
      const pa = profilesById[a.user_id];
      const pb = profilesById[b.user_id];
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

    const bodies: string[] = new Array(sorted.length);
    const batchSize = 4;
    for (let i = 0; i < sorted.length; i += batchSize) {
      const slice = sorted.slice(i, i + batchSize);
      const texts = await Promise.all(
        slice.map(async (sub) => {
          const path = submissionStorageObjectPath(sub);
          if (!path) {
            return "[No thesis file was uploaded for this abstract.]";
          }
          const ext = fileExtensionFromPath(path);
          if (ext !== ".pdf" && ext !== ".docx") {
            return "[Unsupported file type for automatic text extraction.]";
          }
          const { data: blob, error } = await supabase.storage.from(ABSTRACTS_BUCKET).download(path);
          if (error || !blob) {
            console.warn("[admin export abstract-book] download failed", { id: sub.id, message: error?.message });
            return "[Could not download the thesis file from storage.]";
          }
          const buf = Buffer.from(await blob.arrayBuffer());
          try {
            const t = await extractTextFromSubmissionFile(buf, ext);
            return t.trim() || "[No text could be extracted from the file.]";
          } catch (e) {
            console.error("[admin export abstract-book] extract failed", { id: sub.id, e });
            return "[Could not extract text from the thesis file.]";
          }
        })
      );
      for (let j = 0; j < slice.length; j += 1) {
        bodies[i + j] = texts[j] ?? "";
      }
    }

    const entries = sorted.map((sub, idx) => {
      const prof = profilesById[sub.user_id];
      const author = authorDisplayNameFromProfile(prof);
      const title = (sub.abstract_title ?? "").trim() || "—";
      const inst = (prof?.institution ?? "").trim();
      const country = (sub.country ?? "").trim();
      const aff = inst && country ? `${inst}, ${country}` : inst || country || "—";
      return {
        displayNumber: idx + 1,
        authorFullName: author,
        titleAllCaps: title.toLocaleUpperCase("uk-UA"),
        affiliationItalic: aff,
        bodyText: bodies[idx] ?? ""
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
