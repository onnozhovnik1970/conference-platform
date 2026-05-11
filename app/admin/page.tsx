"use client";

import Image from "next/image";
import Link from "next/link";
import { Download, Loader2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ALLOWED_ADMIN_EMAILS } from "@/lib/admin";
import "@/lib/i18n/config";
import { supabase } from "@/lib/supabase";

const STATUS_OPTIONS = ["pending", "pending_review", "under_review", "accepted", "rejected", "needs_revision"] as const;
type SubmissionAdminStatus = (typeof STATUS_OPTIONS)[number];

function isSubmissionAdminStatus(value: string): value is SubmissionAdminStatus {
  return (STATUS_OPTIONS as readonly string[]).includes(value);
}

function normalizeStatus(value: string | null | undefined): SubmissionAdminStatus {
  if (value && isSubmissionAdminStatus(value)) {
    return value;
  }
  return "pending";
}

/** Row shape returned from GET /api/admin/submissions (Supabase `submissions` + joined `profiles`). */
type SubmissionRecord = {
  id: number;
  user_id: string;
  created_at: string | null;
  abstract_title: string | null;
  thematic_panel: string | null;
  status: string | null;
  reviewer_comment: string | null;
  file_path: string | null;
};

type ProfileRecord = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
};

type AdminRow = {
  id: number;
  userId: string;
  createdAt: string | null;
  title: string;
  section: string;
  authorName: string;
  status: SubmissionAdminStatus;
  reviewerComment: string;
  /** Supabase Storage path in bucket `abstracts`, or null if none. */
  filePath: string | null;
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

function statusBadgeClass(status: SubmissionAdminStatus): string {
  const base = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium";
  switch (status) {
    case "accepted":
      return `${base} border-emerald-400/50 bg-emerald-500/15 text-emerald-200`;
    case "rejected":
      return `${base} border-rose-400/50 bg-rose-500/15 text-rose-200`;
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

export default function AdminPage() {
  const { t, i18n } = useTranslation();

  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const adminEmailsSet = useMemo(() => {
    return new Set(ALLOWED_ADMIN_EMAILS.map((value) => value.trim().toLowerCase()).filter(Boolean));
  }, []);

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
    (status: SubmissionAdminStatus) => {
      switch (status) {
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
          section: submission.thematic_panel?.trim() || "—",
          authorName: buildAuthorName(profile, unknownAuthor),
          status: normalizeStatus(submission.status),
          reviewerComment: submission.reviewer_comment ?? "",
          filePath: submission.file_path?.trim() || null
        };
      })
    );
  }, [fetchAsAdmin, t]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setIsAuthenticated(false);
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      const userEmail = user.email?.toLowerCase() ?? "";
      setIsAuthenticated(true);
      if (!adminEmailsSet.has(userEmail)) {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      setIsAuthorized(true);
      await loadSubmissions();
      setIsLoading(false);
    };

    void init();
  }, [adminEmailsSet, loadSubmissions]);

  const handleAdminLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    setError(null);
    setIsSubmittingLogin(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError || !data.user) {
        setAuthError(t("adminLoginAuthError"));
        return;
      }

      const normalizedEmail = data.user.email?.toLowerCase() ?? "";
      setIsAuthenticated(true);

      if (!adminEmailsSet.has(normalizedEmail)) {
        setIsAuthorized(false);
        return;
      }

      setIsAuthorized(true);
      setAuthError(null);
      await loadSubmissions();
    } catch {
      setAuthError(t("adminLoginUnexpectedError"));
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  const handleStatusChange = (id: number, value: string) => {
    const next = normalizeStatus(value);
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
      setError(t("adminUpdateStatusError"));
      setSavingId(null);
      return;
    }

    const notify = await fetchAsAdmin("/api/email/status-notification", {
      method: "POST",
      body: JSON.stringify({
        userId: row.userId,
        participantName: row.authorName,
        abstractTitle: row.title,
        newStatus: row.status,
        reviewerComment: row.reviewerComment.trim() || null
      })
    });

    setSavingId(null);

    if (notify.missingSession || !notify.response?.ok) {
      setError(t("adminEmailNotificationError"));
    }
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
      setError(t("adminFileNotAvailable"));
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
    <main className="min-h-screen">
      <section className="animated-academic-gradient relative overflow-hidden py-6 md:py-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.25),_transparent_45%)]" />
        <div className="container relative z-10">
          <header className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3 text-lg font-semibold tracking-tight text-white">
              <Image src="/knteu_logo_200.png" alt="SUTE logo" width={160} height={50} className="h-[50px] w-auto" priority />
              <span>{t("navBrand")}</span>
            </Link>
            <div className="flex items-center gap-3">
              <Button asChild size="sm">
                <Link href="/">{t("navHome")}</Link>
              </Button>
              <LanguageSwitcher />
            </div>
          </header>

          <div className="mx-auto mt-10 max-w-7xl space-y-6 pb-10">
            <Card className="border-white/10 bg-black/35 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-3xl text-white">{t("adminTitle")}</CardTitle>
                <CardDescription className="text-slate-300">{t("adminSubtitle")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading && <p className="text-slate-300">{t("adminLoading")}</p>}

                {!isLoading && !isAuthenticated && (
                  <form onSubmit={handleAdminLogin} className="space-y-5">
                    {authError && (
                      <div className="rounded-md border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                        {authError}
                      </div>
                    )}
                    <div>
                      <label htmlFor="admin-email" className="block text-sm font-medium text-slate-100">
                        {t("email")}
                      </label>
                      <input
                        id="admin-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="mt-2 h-11 w-full rounded-md border border-white/20 bg-white/5 px-3 text-sm text-white placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                        placeholder={t("email")}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="admin-password" className="block text-sm font-medium text-slate-100">
                        {t("password")}
                      </label>
                      <input
                        id="admin-password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="mt-2 h-11 w-full rounded-md border border-white/20 bg-white/5 px-3 text-sm text-white placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                        placeholder={t("password")}
                        required
                      />
                    </div>
                    <Button type="submit" size="lg" className="w-full md:w-auto" disabled={isSubmittingLogin}>
                      {isSubmittingLogin ? t("adminLoginSubmitting") : t("adminLoginSubmit")}
                    </Button>
                  </form>
                )}

                {!isLoading && isAuthenticated && !isAuthorized && (
                  <div className="rounded-md border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                    {t("adminAccessDenied")}
                  </div>
                )}

                {!isLoading && isAuthorized && error && (
                  <div className="rounded-md border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                    {error}
                  </div>
                )}

                {!isLoading && isAuthorized && rows.length === 0 && (
                  <p className="text-slate-300">{t("adminNoSubmissions")}</p>
                )}

                {!isLoading && isAuthorized && rows.length > 0 && (
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
                        {rows.map((row) => {
                          const isSaving = savingId === row.id;
                          const isDownloading = downloadingId === row.id;
                          const canDownload = Boolean(row.filePath);
                          return (
                            <tr key={row.id}>
                              <td className="max-w-[10rem] px-4 py-3 text-slate-200">{row.authorName}</td>
                              <td className="max-w-[14rem] px-4 py-3 text-slate-200">{row.title}</td>
                              <td className="max-w-[12rem] px-4 py-3 text-slate-200">{row.section}</td>
                              <td className="whitespace-nowrap px-4 py-3 text-slate-200">{formatDate(row.createdAt)}</td>
                              <td className="px-4 py-3 align-top">
                                <div className="flex flex-col gap-2">
                                  <span className={statusBadgeClass(row.status)}>{formatStatusLabel(row.status)}</span>
                                  <select
                                    value={row.status}
                                    onChange={(event) => handleStatusChange(row.id, event.target.value)}
                                    className="h-9 w-full min-w-[10rem] rounded-md border border-white/20 bg-white/5 px-2 text-xs text-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                                    aria-label={t("adminStatus")}
                                  >
                                    {STATUS_OPTIONS.map((option) => (
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
                                  className="w-full resize-y rounded-md border border-white/20 bg-white/5 px-2 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                                  placeholder={t("adminReviewerComment")}
                                />
                              </td>
                              <td className="px-4 py-3 align-top">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Button type="button" size="sm" onClick={() => void handleSaveRow(row)} disabled={isSaving}>
                                    {isSaving ? t("adminSaving") : t("adminSave")}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-9 w-9 shrink-0 border-white/25 bg-white/5 p-0 text-white hover:bg-white/15"
                                    disabled={!canDownload || isDownloading || isSaving}
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
          </div>
        </div>
      </section>
    </main>
  );
}
