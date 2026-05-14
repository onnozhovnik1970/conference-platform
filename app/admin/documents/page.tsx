"use client";

import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import "@/lib/i18n/config";
import { supabase } from "@/lib/supabase";

type ExportKey = "participants" | "theses" | "book";

function parseAttachmentFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) {
    return null;
  }
  const utf8Match = /filename\*=(?:UTF-8''|utf-8'')([^;]+)/i.exec(contentDisposition);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim().replace(/^"(.*)"$/, "$1"));
    } catch {
      return utf8Match[1].trim();
    }
  }
  const asciiMatch = /filename="([^"]+)"/i.exec(contentDisposition);
  if (asciiMatch?.[1]) {
    return asciiMatch[1];
  }
  return null;
}

export default function AdminDocumentsPage() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<ExportKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchAsAdmin = useCallback(async (input: string, init?: RequestInit) => {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return { response: null as Response | null, missingSession: true as const };
    }
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${session.access_token}`);
    const response = await fetch(input, { ...init, headers, cache: "no-store" });
    return { response, missingSession: false as const };
  }, []);

  const triggerDownload = useCallback(
    async (key: ExportKey, url: string, fallbackName: string) => {
      setError(null);
      setNotice(null);
      setBusy(key);
      try {
        const { response, missingSession } = await fetchAsAdmin(url);
        if (missingSession || !response) {
          setError(t("adminDocumentsExportError"));
          return;
        }
        if (!response.ok) {
          try {
            const body = (await response.json()) as { error?: string };
            setError(body.error?.trim() || t("adminDocumentsExportError"));
          } catch {
            setError(t("adminDocumentsExportError"));
          }
          return;
        }
        const blob = await response.blob();
        const downloadName = parseAttachmentFilename(response.headers.get("content-disposition")) ?? fallbackName;
        const href = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = href;
        anchor.download = downloadName;
        anchor.rel = "noopener";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(href);
        setNotice(t("adminDocumentsDownloadStarted", { file: downloadName }));
      } catch {
        setError(t("adminDocumentsExportError"));
      } finally {
        setBusy(null);
      }
    },
    [fetchAsAdmin, t]
  );

  const cardClass = "border-white/10 bg-black/35 backdrop-blur";

  return (
    <div className="space-y-6">
      <Card className={cardClass}>
        <CardHeader>
          <CardTitle className="text-2xl text-white">{t("adminDocumentsTitle")}</CardTitle>
          <CardDescription className="text-slate-300">{t("adminDocumentsSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>
          )}
          {notice && !error && <div className="rounded-md border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{notice}</div>}

          <div className="rounded-lg border border-white/10 bg-black/25 p-4">
            <h3 className="text-lg font-semibold text-white">{t("adminDocumentsParticipantsTitle")}</h3>
            <p className="mt-1 text-sm text-slate-400">{t("adminDocumentsParticipantsDesc")}</p>
            <Button
              className="mt-4"
              disabled={busy !== null}
              onClick={() => void triggerDownload("participants", "/api/admin/exports/participants", "conference-participants.csv")}
            >
              {busy === "participants" ? t("adminDocumentsExporting") : t("adminDocumentsParticipantsButton")}
            </Button>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/25 p-4">
            <h3 className="text-lg font-semibold text-white">{t("adminDocumentsThesesTitle")}</h3>
            <p className="mt-1 text-sm text-slate-400">{t("adminDocumentsThesesDesc")}</p>
            <Button
              className="mt-4"
              disabled={busy !== null}
              onClick={() => void triggerDownload("theses", "/api/admin/exports/theses-zip", "conference-theses.zip")}
            >
              {busy === "theses" ? t("adminDocumentsExporting") : t("adminDocumentsThesesButton")}
            </Button>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/25 p-4">
            <h3 className="text-lg font-semibold text-white">{t("adminDocumentsAbstractBookTitle")}</h3>
            <p className="mt-1 text-sm text-slate-400">{t("adminDocumentsAbstractBookDesc")}</p>
            <Button
              className="mt-4"
              disabled={busy !== null}
              onClick={() => void triggerDownload("book", "/api/admin/exports/abstract-book", "abstract-book.pdf")}
            >
              {busy === "book" ? t("adminDocumentsExporting") : t("adminDocumentsAbstractBookButton")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
