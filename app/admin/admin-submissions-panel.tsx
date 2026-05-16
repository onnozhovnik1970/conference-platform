"use client";

import { Award, Download, Loader2, Mail, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ADMIN_STATUS_OPTIONS,
  matchesAdminSubmissionsView,
  normalizeAdminSubmissionStatus,
  type AdminSubmissionStatus,
  type AdminSubmissionsView
} from "@/lib/admin/submission-filters";
import { sectionLabel, type ConferenceSectionRow } from "@/lib/conference-sections";
import "@/lib/i18n/config";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const LEGACY_PANEL_KEYS = ["panel1", "panel2", "panel3", "panel4", "panel5", "panel6"] as const;

export type { AdminSubmissionsView };

type SubmissionRecord = {
  id: number;
  user_id: string;
  created_at: string | null;
  abstract_title: string | null;
  thematic_panel: string | null;
  section_id: string | null;
  status: string | null;
  reviewer_comment: string | null;
  file_path: string | null;
  archived_at: string | null;
};

type ProfileRecord = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
};

export type AdminRow = {
  id: number;
  userId: string;
  createdAt: string | null;
  title: string;
  sectionId: string | null;
  thematicPanelRaw: string;
  authorName: string;
  status: AdminSubmissionStatus;
  reviewerComment: string;
  filePath: string | null;
  archivedAt: string | null;
};

function buildAuthorName(profile: ProfileRecord | undefined, unknownLabel: string): string {
  if (!profile) {
    return unknownLabel;
  }
  const parts = [profile.last_name, profile.first_name, profile.middle_name].filter(
    (part): part is string => typeof part === "string" && Boolean(part.trim())
  );
  const name = parts.join(" ").trim();
  return name || unknownLabel;
}

function statusBadgeClass(status: AdminSubmissionStatus): string {
  const base = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium";
  switch (status) {
    case "accepted":
      return `${base} border-emerald-400/50 bg-emerald-500/15 text-emerald-200`;
    case "rejected":
      return `${base} border-rose-400/50 bg-rose-500/15 text-rose-200`;
    case "draft":
      return `${base} border-slate-400/50 bg-slate-500/15 text-slate-200`;
    case "pending":
      return `${base} border-amber-400/50 bg-amber-400/15 text-amber-100`;
    case "pending_review":
    case "under_review":
      return `${base} border-sky-400/50 bg-sky-500/15 text-sky-100`;
    case "needs_revision":
      return `${base} border-orange-400/50 bg-orange-500/15 text-orange-100`;
    default:
      return `${base} border-white/20 bg-white/10 text-slate-200`;
  }
}

function filterRows(rows: AdminRow[], view: AdminSubmissionsView): AdminRow[] {
  return rows.filter((r) => matchesAdminSubmissionsView(r.status, r.archivedAt, view));
}

type AdminSubmissionsPanelProps = {
  view: AdminSubmissionsView;
  titleKey: string;
};

export function AdminSubmissionsPanel({ view, titleKey }: AdminSubmissionsPanelProps) {
  const { t, i18n } = useTranslation();

  const [error, setError] = useState<string | null>(null);
  const [infoNotice, setInfoNotice] = useState<string | null>(null);
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [certificateDownloadingId, setCertificateDownloadingId] = useState<number | null>(null);
  const [certificateSendingId, setCertificateSendingId] = useState<number | null>(null);
  const [archiveId, setArchiveId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isClearingRejected, setIsClearingRejected] = useState(false);
  const [sectionFilter, setSectionFilter] = useState<"all" | string>("all");
  const [sections, setSections] = useState<ConferenceSectionRow[]>([]);

  const fetchAsAdmin = useCallback(async (input: string, init?: RequestInit) => {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return { response: null as Response | null, missingSession: true as const };
    }
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${session.access_token}`);
    if (init?.body != null && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const response = await fetch(input, { ...init, headers });
    return { response, missingSession: false as const };
  }, []);

  const formatStatusLabel = useCallback(
    (status: AdminSubmissionStatus) => {
      switch (status) {
        case "draft":
          return t("adminStatusDraft");
        case "pending":
          return t("adminStatusPending");
        case "pending_review":
          return t("adminStatusPendingReview");
        case "under_review":
          return t("adminStatusUnderReview");
        case "accepted":
          return t("adminStatusAccepted");
        case "rejected":
          return t("adminStatusRejected");
        case "needs_revision":
          return t("adminStatusNeedsRevision");
        default:
          return t("adminStatusUnknown");
      }
    },
    [t]
  );

  const loadSubmissions = useCallback(async () => {
    setError(null);
    setInfoNotice(null);

    const { response, missingSession } = await fetchAsAdmin("/api/admin/submissions");
    if (missingSession || !response) {
      setError(t("adminLoadError"));
      return;
    }

    if (response.status === 401 || response.status === 403) {
      setError(t("adminAccessDenied"));
      return;
    }

    if (!response.ok) {
      setError(t("adminLoadError"));
      return;
    }

    const payload = (await response.json()) as {
      submissions: SubmissionRecord[];
      profilesById: Record<string, ProfileRecord>;
    };

    const submissions = payload.submissions ?? [];
    const profilesById = payload.profilesById ?? {};

    const unknownAuthor = t("adminUnknownStudent");
    setRows(
      submissions.map((submission) => {
        const profile = profilesById[submission.user_id];
        return {
          id: submission.id,
          userId: submission.user_id,
          createdAt: submission.created_at,
          title: submission.abstract_title?.trim() || "—",
          sectionId: submission.section_id?.trim() || null,
          thematicPanelRaw: submission.thematic_panel?.trim() || "",
          authorName: buildAuthorName(profile, unknownAuthor),
          status: normalizeAdminSubmissionStatus(submission.status),
          reviewerComment: submission.reviewer_comment ?? "",
          filePath: submission.file_path?.trim() || null,
          archivedAt: submission.archived_at
        };
      })
    );
  }, [fetchAsAdmin, t]);

  useEffect(() => {
    void loadSubmissions();
  }, [loadSubmissions]);

  useEffect(() => {
    const loadSections = async () => {
      try {
        const res = await fetch("/api/conference-sections", { cache: "no-store" });
        const json = (await res.json()) as { sections?: ConferenceSectionRow[] };
        setSections(json.sections ?? []);
      } catch {
        setSections([]);
      }
    };
    void loadSections();
  }, []);

  const sectionsById = useMemo(() => Object.fromEntries(sections.map((s) => [s.id, s])), [sections]);

  const rowMatchesSectionFilter = useCallback(
    (row: AdminRow, filterId: string) => {
      if (filterId === "all") {
        return true;
      }
      if (row.sectionId === filterId) {
        return true;
      }
      const sec = sectionsById[filterId];
      const raw = row.thematicPanelRaw.trim();
      if (sec?.slug && raw === sec.slug) {
        return true;
      }
      return false;
    },
    [sectionsById]
  );

  const formatRowSectionLabel = useCallback(
    (row: AdminRow) => {
      if (row.sectionId && sectionsById[row.sectionId]) {
        return sectionLabel(sectionsById[row.sectionId], i18n.language);
      }
      const raw = row.thematicPanelRaw.trim();
      if ((LEGACY_PANEL_KEYS as readonly string[]).includes(raw)) {
        return t(raw as (typeof LEGACY_PANEL_KEYS)[number]);
      }
      return raw || "—";
    },
    [sectionsById, i18n.language, t]
  );

  const viewFiltered = useMemo(() => filterRows(rows, view), [rows, view]);

  const displayRows = useMemo(() => {
    if (sectionFilter === "all") {
      return viewFiltered;
    }
    return viewFiltered.filter((r) => rowMatchesSectionFilter(r, sectionFilter));
  }, [viewFiltered, sectionFilter, rowMatchesSectionFilter]);

  const handleStatusChange = (id: number, value: string) => {
    const next = normalizeAdminSubmissionStatus(value);
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, status: next } : row)));
  };

  const handleCommentChange = (id: number, value: string) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, reviewerComment: value } : row)));
  };

  const handleSaveRow = async (row: AdminRow) => {
    setError(null);
    setSavingId(row.id);

    const { response, missingSession } = await fetchAsAdmin(`/api/admin/submissions/${encodeURIComponent(String(row.id))}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: row.status,
        reviewer_comment: row.reviewerComment.trim() || null
      })
    });

    if (missingSession || !response) {
      setError(t("adminUpdateStatusError"));
      setSavingId(null);
      return;
    }

    if (!response.ok) {
      try {
        const body = (await response.json()) as { error?: string };
        setError(body?.error?.trim() || t("adminUpdateStatusError"));
      } catch {
        setError(t("adminUpdateStatusError"));
      }
      setSavingId(null);
      return;
    }

    setSavingId(null);
    setInfoNotice(t("adminSaveSuccess"));

    const shouldNotify = row.status !== "draft";
    if (shouldNotify) {
      const notify = await fetchAsAdmin("/api/email/status-notification", {
        method: "POST",
        body: JSON.stringify({
          userId: row.userId,
          participantName: row.authorName,
          abstractTitle: row.title === "—" ? t("abstractTitle") : row.title,
          newStatus: row.status,
          reviewerComment: row.reviewerComment.trim() || null
        })
      });

      if (notify.missingSession || !notify.response?.ok) {
        setInfoNotice(t("adminSaveSuccessEmailFailed"));
      }
    }

    setRows((prev) => prev.filter((r) => matchesAdminSubmissionsView(r.status, r.archivedAt, view)));
    await loadSubmissions();
  };

  const handleDeletePermanent = async (row: AdminRow) => {
    if (!window.confirm(t("adminDeleteSubmissionConfirm"))) {
      return;
    }

    setError(null);
    setInfoNotice(null);
    setDeletingId(row.id);

    const { response, missingSession } = await fetchAsAdmin(
      `/api/admin/submissions/${encodeURIComponent(String(row.id))}`,
      { method: "DELETE" }
    );

    setDeletingId(null);

    if (missingSession || !response?.ok) {
      try {
        const body = (await response?.json()) as { error?: string };
        setError(body?.error?.trim() || t("adminDeleteSubmissionError"));
      } catch {
        setError(t("adminDeleteSubmissionError"));
      }
      return;
    }

    setRows((prev) => prev.filter((r) => r.id !== row.id));
    await loadSubmissions();
  };

  const handleClearAllRejected = async () => {
    if (!window.confirm(t("adminClearRejectedConfirm"))) {
      return;
    }

    setError(null);
    setInfoNotice(null);
    setIsClearingRejected(true);

    const { response, missingSession } = await fetchAsAdmin("/api/admin/submissions/clear-rejected", {
      method: "POST"
    });

    setIsClearingRejected(false);

    if (missingSession || !response?.ok) {
      try {
        const body = (await response?.json()) as { error?: string };
        setError(body?.error?.trim() || t("adminClearRejectedError"));
      } catch {
        setError(t("adminClearRejectedError"));
      }
      return;
    }

    const data = (await response.json()) as { deleted?: number };
    setInfoNotice(t("adminClearRejectedSuccess", { count: data.deleted ?? 0 }));
    await loadSubmissions();
  };

  const handleArchiveToggle = async (row: AdminRow, archive: boolean) => {
    setError(null);
    setArchiveId(row.id);
    const { response, missingSession } = await fetchAsAdmin(`/api/admin/submissions/${encodeURIComponent(String(row.id))}`, {
      method: "PATCH",
      body: JSON.stringify({ archive })
    });

    setArchiveId(null);

    if (missingSession || !response?.ok) {
      setError(t("adminUpdateStatusError"));
      return;
    }

    setRows((prev) => prev.filter((r) => matchesAdminSubmissionsView(r.status, r.archivedAt, view)));
    await loadSubmissions();
  };

  const parseFilenameFromContentDisposition = (header: string | null): string | null => {
    if (!header) return null;
    const utf8Match = /filename\*=(?:UTF-8''|utf-8'')([^;]+)/i.exec(header);
    if (utf8Match?.[1]) {
      try {
        return decodeURIComponent(utf8Match[1].trim().replace(/^"(.*)"$/, "$1"));
      } catch {
        return utf8Match[1].trim();
      }
    }
    const asciiMatch = /filename="([^"]+)"/i.exec(header);
    if (asciiMatch?.[1]) return asciiMatch[1];
    const looseMatch = /filename=([^;\s]+)/i.exec(header);
    return looseMatch?.[1]?.replace(/^"(.*)"$/, "$1") ?? null;
  };

  const handleDownloadAbstract = async (row: AdminRow) => {
    if (!row.filePath) {
      return;
    }
    setError(null);
    setDownloadingId(row.id);
    const { response, missingSession } = await fetchAsAdmin(
      `/api/admin/submissions/${encodeURIComponent(String(row.id))}/download`,
      { method: "GET" }
    );

    if (missingSession || !response) {
      setError(t("adminFileDownloadError"));
      setDownloadingId(null);
      return;
    }

    if (!response.ok) {
      try {
        const body = (await response.json()) as { error?: string };
        setError(body.error?.trim() || t("adminFileDownloadError"));
      } catch {
        setError(t("adminFileDownloadError"));
      }
      setDownloadingId(null);
      return;
    }

    try {
      const blob = await response.blob();
      const fromHeader = parseFilenameFromContentDisposition(response.headers.get("content-disposition"));
      const fallback = row.filePath.split("/").pop() || `abstract-${row.id}`;
      const downloadName = fromHeader || fallback;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = downloadName;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError(t("adminFileDownloadError"));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadCertificate = async (row: AdminRow) => {
    if (row.status !== "accepted" || row.archivedAt) {
      return;
    }
    setError(null);
    setCertificateDownloadingId(row.id);
    const { response, missingSession } = await fetchAsAdmin(
      `/api/admin/certificates/${encodeURIComponent(String(row.id))}`,
      { method: "GET" }
    );

    if (missingSession || !response) {
      setError(t("adminCertificatesRowError"));
      setCertificateDownloadingId(null);
      return;
    }

    if (!response.ok) {
      try {
        const body = (await response.json()) as { error?: string };
        setError(body.error?.trim() || t("adminCertificatesRowError"));
      } catch {
        setError(t("adminCertificatesRowError"));
      }
      setCertificateDownloadingId(null);
      return;
    }

    try {
      const blob = await response.blob();
      const fromHeader = parseFilenameFromContentDisposition(response.headers.get("content-disposition"));
      const downloadName = fromHeader || `certificate-${row.id}.pdf`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = downloadName;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError(t("adminCertificatesRowError"));
    } finally {
      setCertificateDownloadingId(null);
    }
  };

  const handleSendCertificateEmail = async (row: AdminRow) => {
    if (row.status !== "accepted" || row.archivedAt || view !== "accepted") {
      return;
    }
    setError(null);
    setInfoNotice(null);
    setCertificateSendingId(row.id);
    try {
      const { response, missingSession } = await fetchAsAdmin(
        `/api/admin/certificates/send/${encodeURIComponent(String(row.id))}`,
        { method: "POST" }
      );
      if (missingSession || !response) {
        setError(t("adminCertificatesSendEmailError"));
        return;
      }
      const data = (await response.json().catch(() => null)) as { success?: boolean; error?: string; to?: string } | null;
      if (!response.ok) {
        setError(data?.error?.trim() || t("adminCertificatesSendEmailError"));
        return;
      }
      if (data?.success && data.to) {
        setError(null);
        setInfoNotice(t("adminCertificatesSendEmailSuccess", { email: data.to }));
      }
    } catch {
      setError(t("adminCertificatesSendEmailError"));
    } finally {
      setCertificateSendingId(null);
    }
  };

  const formatDate = (value: string | null) => {
    if (!value) {
      return "—";
    }

    const locale = i18n.language === "ua" ? "uk-UA" : "en-US";
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  };

  return (
    <Card className="border-white/10 bg-black/35 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-2xl text-white">{t(titleKey)}</CardTitle>
        <CardDescription className="text-slate-300">{t("adminSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>
        )}
        {infoNotice && (
          <div className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{infoNotice}</div>
        )}

        {view === "rejected" && viewFiltered.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-rose-400/50 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25"
              disabled={isClearingRejected}
              onClick={() => void handleClearAllRejected()}
            >
              {isClearingRejected ? t("adminClearingRejected") : t("adminClearAllRejected")}
            </Button>
          </div>
        )}

        {rows.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("adminFilterSectionLabel")}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSectionFilter("all")}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  sectionFilter === "all"
                    ? "bg-primary text-primary-foreground"
                    : "border border-white/20 bg-white/5 text-slate-200 hover:bg-white/10"
                )}
              >
                {t("adminFilterAll")}
              </button>
              {sections.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setSectionFilter(sec.id)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    sectionFilter === sec.id
                      ? "bg-primary text-primary-foreground"
                      : "border border-white/20 bg-white/5 text-slate-200 hover:bg-white/10"
                  )}
                >
                  {sectionLabel(sec, i18n.language)}
                </button>
              ))}
            </div>
          </div>
        )}

        {viewFiltered.length === 0 && <p className="text-slate-300">{t("adminNoSubmissions")}</p>}

        {viewFiltered.length > 0 && displayRows.length === 0 && (
          <p className="text-slate-300">{t("adminNoSubmissionsForFilter")}</p>
        )}

        {displayRows.length > 0 && (
          <div className="overflow-x-auto rounded-md border border-white/15">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-200">{t("adminAuthorName")}</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-200">{t("adminAbstractTitle")}</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-200">{t("adminSection")}</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-200">{t("adminSubmissionDate")}</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-200">{t("adminStatus")}</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-200">{t("adminReviewerComment")}</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-200">{t("adminActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-black/20">
                {displayRows.map((row) => {
                  const isSaving = savingId === row.id;
                  const isDownloading = downloadingId === row.id;
                  const isCertDownloading = certificateDownloadingId === row.id;
                  const isCertSending = certificateSendingId === row.id;
                  const isArchiving = archiveId === row.id;
                  const isDeleting = deletingId === row.id;
                  const canDownload = Boolean(row.filePath);
                  const isArchived = Boolean(row.archivedAt);
                  const canCertificate = row.status === "accepted" && !isArchived;
                  const sectionCol = formatRowSectionLabel(row);
                  return (
                    <tr key={row.id}>
                      <td className="max-w-[10rem] px-4 py-3 text-slate-200">{row.authorName}</td>
                      <td className="max-w-[14rem] px-4 py-3 text-slate-200">{row.title}</td>
                      <td className="max-w-[12rem] px-4 py-3 text-slate-200">{sectionCol}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-200">{formatDate(row.createdAt)}</td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-2">
                          <span className={statusBadgeClass(row.status)}>{formatStatusLabel(row.status)}</span>
                          <select
                            value={row.status}
                            onChange={(event) => handleStatusChange(row.id, event.target.value)}
                            className="h-9 w-full min-w-[10rem] rounded-md border border-white/20 bg-white/5 px-2 text-xs text-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                            aria-label={t("adminStatus")}
                            disabled={isArchived}
                          >
                            {ADMIN_STATUS_OPTIONS.map((option) => (
                              <option key={option} value={option} className="bg-slate-900 text-white">
                                {formatStatusLabel(option)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="min-w-[12rem] px-4 py-3 align-top">
                        <textarea
                          value={row.reviewerComment}
                          onChange={(event) => handleCommentChange(row.id, event.target.value)}
                          rows={3}
                          disabled={isArchived}
                          className="w-full resize-y rounded-md border border-white/20 bg-white/5 px-2 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
                          placeholder={t("adminReviewerComment")}
                        />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-wrap items-center gap-2">
                          <Button type="button" size="sm" onClick={() => void handleSaveRow(row)} disabled={isSaving || isArchived}>
                            {isSaving ? t("adminSaving") : t("adminSave")}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 w-9 shrink-0 border-white/25 bg-white/5 p-0 text-white hover:bg-white/15"
                            disabled={!canDownload || isDownloading || isSaving || isArchived}
                            title={
                              isDownloading
                                ? t("adminDownloading")
                                : canDownload
                                  ? t("adminDownload")
                                  : t("adminFileNotAvailable")
                            }
                            aria-label={
                              isDownloading
                                ? t("adminDownloading")
                                : canDownload
                                  ? t("adminDownload")
                                  : t("adminFileNotAvailable")
                            }
                            onClick={() => void handleDownloadAbstract(row)}
                          >
                            {isDownloading ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                            ) : (
                              <Download className="h-4 w-4" aria-hidden />
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 w-9 shrink-0 border-amber-400/40 bg-amber-500/10 p-0 text-amber-100 hover:bg-amber-500/20"
                            disabled={!canCertificate || isCertDownloading || isSaving || isArchived}
                            title={
                              isCertDownloading ? t("adminCertificatesGenerating") : t("adminCertificatesDownloadOne")
                            }
                            aria-label={t("adminCertificatesDownloadOne")}
                            onClick={() => void handleDownloadCertificate(row)}
                          >
                            {isCertDownloading ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                            ) : (
                              <Award className="h-4 w-4" aria-hidden />
                            )}
                          </Button>
                          {view === "accepted" && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-9 w-9 shrink-0 border-sky-400/40 bg-sky-500/10 p-0 text-sky-100 hover:bg-sky-500/20"
                              disabled={!canCertificate || isCertSending || isSaving || isArchived}
                              title={isCertSending ? t("adminCertificatesSendingEmail") : t("adminCertificatesSendEmail")}
                              aria-label={t("adminCertificatesSendEmail")}
                              onClick={() => void handleSendCertificateEmail(row)}
                            >
                              {isCertSending ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                              ) : (
                                <Mail className="h-4 w-4" aria-hidden />
                              )}
                            </Button>
                          )}
                          {!isArchived ? (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={isArchiving || isDeleting}
                              onClick={() => void handleArchiveToggle(row, true)}
                            >
                              {t("adminArchive")}
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={isArchiving || isDeleting}
                              onClick={() => void handleArchiveToggle(row, false)}
                            >
                              {t("adminRestore")}
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 w-9 shrink-0 border-rose-500/60 bg-rose-600/25 p-0 text-rose-100 hover:bg-rose-600/45"
                            disabled={isDeleting || isSaving}
                            title={t("adminDeletePermanent")}
                            aria-label={t("adminDeletePermanent")}
                            onClick={() => void handleDeletePermanent(row)}
                          >
                            {isDeleting ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                            ) : (
                              <Trash2 className="h-4 w-4" aria-hidden />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
