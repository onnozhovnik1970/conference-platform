"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  canEditSubmission,
  canStartNewSubmissionRow,
  getParticipantDisplayStatus,
  isSubmissionLocked,
  participantStatusBadgeClass,
  SUBMISSION_STATUS_DRAFT,
  SUBMISSION_STATUS_PENDING_REVIEW,
  type ParticipantDisplayStatus
} from "@/lib/dashboard-submission";
import { sectionLabel, type ConferenceSectionRow } from "@/lib/conference-sections";
import "@/lib/i18n/config";
import { supabase } from "@/lib/supabase";

type Profile = {
  first_name: string | null;
  last_name: string | null;
  institution: string | null;
};

type SubmissionForm = {
  abstractTitle: string;
  faculty: string;
  specialty: string;
  group: string;
  yearOfStudy: string;
  country: string;
  phone: string;
  abstractLanguage: string;
  thematicPanel: string;
  supervisorName: string;
  supervisorTitleDegree: string;
  supervisorPosition: string;
  hasPresentation: "yes" | "no" | "";
};

type ReviewResult = {
  success?: boolean;
  error?: string;
  score?: number;
  scoreMax?: number;
  issues?: string[];
  recommendations?: string[];
  formattingIssues?: string[];
  summary?: string;
  fileName?: string;
  motivationalMessage?: string;
  plagiarismWarning?: string | null;
};

type LatestSubmissionRow = {
  id: number;
  status: string | null;
  ai_score: number | null;
  ai_summary: string | null;
  ai_issues: string[] | null;
  ai_recommendations: string[] | null;
  ai_formatting_issues: string[] | null;
  file_path: string | null;
  abstract_title: string | null;
  faculty: string | null;
  specialty: string | null;
  group_name: string | null;
  year_of_study: number | string | null;
  country: string | null;
  phone: string | null;
  abstract_language: string | null;
  section_id: string | null;
  supervisor_name: string | null;
  supervisor_title_degree: string | null;
  supervisor_position: string | null;
  has_presentation: boolean | null;
};

const dashboardCardClass =
  "rounded-2xl border border-[rgba(15,35,71,0.1)] bg-white text-[#0f2347] shadow-[0_4px_24px_rgba(15,35,71,0.06)]";

const dashboardPanelClass = "rounded-2xl border border-[rgba(15,35,71,0.1)] bg-white p-4";

const initialSubmissionForm: SubmissionForm = {
  abstractTitle: "",
  faculty: "",
  specialty: "",
  group: "",
  yearOfStudy: "",
  country: "",
  phone: "",
  abstractLanguage: "",
  thematicPanel: "",
  supervisorName: "",
  supervisorTitleDegree: "",
  supervisorPosition: "",
  hasPresentation: ""
};

const SUBMISSION_SELECT =
  "id, status, ai_score, ai_summary, ai_issues, ai_recommendations, ai_formatting_issues, file_path, abstract_title, faculty, specialty, group_name, year_of_study, country, phone, abstract_language, section_id, supervisor_name, supervisor_title_degree, supervisor_position, has_presentation, created_at";

function reviewResultFromRow(row: LatestSubmissionRow): ReviewResult {
  return {
    score: row.ai_score ?? undefined,
    scoreMax: 10,
    issues: row.ai_issues ?? [],
    recommendations: row.ai_recommendations ?? [],
    formattingIssues: row.ai_formatting_issues ?? [],
    summary: row.ai_summary ?? undefined
  };
}

function formFromRow(row: LatestSubmissionRow): SubmissionForm {
  const year =
    row.year_of_study === null || row.year_of_study === undefined ? "" : String(row.year_of_study);
  let hasPresentation: SubmissionForm["hasPresentation"] = "";
  if (row.has_presentation === true) {
    hasPresentation = "yes";
  } else if (row.has_presentation === false) {
    hasPresentation = "no";
  }

  return {
    abstractTitle: row.abstract_title?.trim() ?? "",
    faculty: row.faculty?.trim() ?? "",
    specialty: row.specialty?.trim() ?? "",
    group: row.group_name?.trim() ?? "",
    yearOfStudy: year,
    country: row.country?.trim() ?? "",
    phone: row.phone?.trim() ?? "",
    abstractLanguage: row.abstract_language?.trim() ?? "",
    thematicPanel: row.section_id?.trim() ?? "",
    supervisorName: row.supervisor_name?.trim() ?? "",
    supervisorTitleDegree: row.supervisor_title_degree?.trim() ?? "",
    supervisorPosition: row.supervisor_position?.trim() ?? "",
    hasPresentation
  };
}

function isFormReadyForCheck(form: SubmissionForm): boolean {
  return Boolean(
    form.abstractTitle.trim() &&
      form.faculty.trim() &&
      form.specialty.trim() &&
      form.abstractLanguage.trim() &&
      form.thematicPanel.trim() &&
      form.supervisorName.trim() &&
      form.hasPresentation
  );
}

function displayStatusLabelKey(status: ParticipantDisplayStatus): string {
  switch (status) {
    case "ai_check":
      return "dashboardStatusAiCheck";
    case "under_review":
      return "dashboardStatusUnderReview";
    case "needs_revision":
      return "dashboardStatusNeedsRevision";
    case "rejected":
      return "dashboardStatusRejected";
    case "accepted":
      return "dashboardStatusAccepted";
    default:
      return "dashboardStatusDraft";
  }
}

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<SubmissionForm>(initialSubmissionForm);
  const [formError, setFormError] = useState<string | null>(null);

  const [reviewFile, setReviewFile] = useState<File | null>(null);
  const [reviewInputKey, setReviewInputKey] = useState(0);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [isCheckingWithAi, setIsCheckingWithAi] = useState(false);

  const [isSubmittingForReview, setIsSubmittingForReview] = useState(false);
  const [submitForReviewError, setSubmitForReviewError] = useState<string | null>(null);
  const [submitForReviewSuccess, setSubmitForReviewSuccess] = useState<string | null>(null);
  const [latestSubmission, setLatestSubmission] = useState<LatestSubmissionRow | null>(null);
  const [sections, setSections] = useState<ConferenceSectionRow[]>([]);

  const loadLatestSubmission = useCallback(async (currentUserId: string) => {
    const { data: latestRows, error: latestSubmissionError } = await supabase
      .from("submissions")
      .select(SUBMISSION_SELECT)
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (latestSubmissionError) {
      console.log("dashboard latest submission load error:", latestSubmissionError);
      return;
    }

    const latest = (latestRows?.[0] as LatestSubmissionRow | undefined) ?? null;
    setLatestSubmission(latest);

    if (latest && canEditSubmission(latest.status)) {
      setFormData(formFromRow(latest));
    }

    if (latest?.ai_score !== null && latest?.ai_score !== undefined) {
      setReviewResult(reviewResultFromRow(latest));
    } else {
      setReviewResult(null);
    }
  }, []);

  const buildSubmissionPayload = useCallback(
    (form: SubmissionForm) => {
      const sectionMeta = sections.find((s) => s.id === form.thematicPanel);
      const thematicPanelDb = sectionMeta?.label_en ?? form.thematicPanel;
      const yearOfStudyValue = form.yearOfStudy === "" ? null : Number.parseInt(form.yearOfStudy, 10);
      const hasPresentationValue: boolean | null = form.hasPresentation === "" ? null : form.hasPresentation === "yes";

      return {
        abstract_title: form.abstractTitle.trim(),
        faculty: form.faculty.trim(),
        specialty: form.specialty.trim(),
        group_name: form.group.trim(),
        year_of_study: yearOfStudyValue,
        country: form.country.trim(),
        phone: form.phone.trim(),
        abstract_language: form.abstractLanguage.trim(),
        section_id: form.thematicPanel || null,
        thematic_panel: thematicPanelDb,
        supervisor_name: form.supervisorName.trim(),
        supervisor_title_degree: form.supervisorTitleDegree.trim(),
        supervisor_position: form.supervisorPosition.trim(),
        has_presentation: hasPresentationValue
      };
    },
    [sections]
  );

  const upsertEditableSubmission = useCallback(
    async (form: SubmissionForm): Promise<{ id: number } | { error: string }> => {
      if (!userId) {
        return { error: "auth" };
      }

      const payload = buildSubmissionPayload(form);
      const latest = latestSubmission;
      const latestStatus = latest?.status ?? null;

      if (latest?.id && canEditSubmission(latestStatus)) {
        const nextStatus =
          latestStatus === "needs_revision" ? "needs_revision" : SUBMISSION_STATUS_DRAFT;
        const { error: updateError } = await supabase
          .from("submissions")
          .update({ ...payload, status: nextStatus })
          .eq("id", latest.id);

        if (updateError) {
          console.log("dashboard submission update error:", updateError);
          return { error: "save" };
        }
        return { id: latest.id };
      }

      if (latest && isSubmissionLocked(latestStatus)) {
        return { error: "locked" };
      }

      if (latest && !canStartNewSubmissionRow(latestStatus)) {
        return { error: "blocked" };
      }

      const { data, error: insertError } = await supabase
        .from("submissions")
        .insert({
          user_id: userId,
          status: SUBMISSION_STATUS_DRAFT,
          ...payload
        })
        .select("id")
        .single();

      if (insertError || !data?.id) {
        console.log("dashboard submission insert error:", insertError);
        return { error: "save" };
      }

      return { id: data.id as number };
    },
    [userId, latestSubmission, buildSubmissionPayload]
  );

  const uploadAbstractFile = useCallback(
    async (file: File, submissionId: number): Promise<{ path: string } | { error: true }> => {
      if (!userId) {
        return { error: true };
      }

      const fileNameParts = file.name.split(".");
      const fileExtension = fileNameParts.length > 1 ? fileNameParts[fileNameParts.length - 1].toLowerCase() : "bin";
      const storagePath = `${userId}/${submissionId}-${Date.now()}.${fileExtension}`;
      const { error: uploadError } = await supabase.storage.from("abstracts").upload(storagePath, file, {
        upsert: true
      });

      if (uploadError) {
        console.log("dashboard storage upload error:", uploadError);
        return { error: true };
      }

      return { path: storagePath };
    },
    [userId]
  );

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      setUserId(user.id);
      await loadLatestSubmission(user.id);

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("first_name, last_name, institution")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.log("dashboard profile load error:", profileError);
        setError(t("dashboardLoadError"));
        setIsLoading(false);
        return;
      }

      setProfile(data);
      setIsLoading(false);
    };

    void loadProfile();
  }, [router, t, loadLatestSubmission]);

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

  const inputClass = "public-tech-input";
  const labelClass = "public-tech-label";

  const updateField = (field: keyof SubmissionForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const latestStatus = latestSubmission?.status ?? null;
  const submissionLocked = !isLoading && isSubmissionLocked(latestStatus);
  const submissionEditable = !isLoading && canEditSubmission(latestStatus);
  const displayStatus = getParticipantDisplayStatus(latestStatus, latestSubmission?.ai_score);
  const displayStatusKey = displayStatusLabelKey(displayStatus);

  const handleReviewFileChange = (file: File | null) => {
    if (submissionLocked) {
      return;
    }

    setReviewError(null);
    setSubmitForReviewError(null);
    setSubmitForReviewSuccess(null);

    if (!file) {
      setReviewFile(null);
      return;
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".docx") && !fileName.endsWith(".pdf")) {
      setReviewFile(null);
      setReviewError(t("dashboardReviewFileTypeError"));
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setReviewFile(null);
      setReviewError(t("dashboardReviewFileSizeError"));
      return;
    }

    setReviewFile(file);
  };

  const handleResetReviewFile = () => {
    setReviewFile(null);
    setReviewResult(null);
    setReviewError(null);
    setSubmitForReviewError(null);
    setSubmitForReviewSuccess(null);
    setReviewInputKey((prev) => prev + 1);
  };

  const handleCheckWithAi = async () => {
    setReviewError(null);
    setSubmitForReviewError(null);
    setSubmitForReviewSuccess(null);
    setFormError(null);

    if (!userId) {
      setReviewError(t("dashboardSubmissionAuthError"));
      return;
    }

    if (submissionLocked) {
      setReviewError(t("dashboardSubmissionLockedNotice"));
      return;
    }

    if (!isFormReadyForCheck(formData)) {
      setFormError(t("dashboardFormIncomplete"));
      return;
    }

    if (!reviewFile) {
      setReviewError(t("dashboardReviewFileRequired"));
      return;
    }

    setIsCheckingWithAi(true);
    try {
      const upserted = await upsertEditableSubmission(formData);
      if ("error" in upserted) {
        if (upserted.error === "locked" || upserted.error === "blocked") {
          setReviewError(t("dashboardSubmissionBlockedActive"));
        } else {
          setReviewError(t("dashboardSubmissionError"));
        }
        return;
      }

      const uploaded = await uploadAbstractFile(reviewFile, upserted.id);
      if ("error" in uploaded) {
        setReviewError(t("dashboardReviewUploadError"));
        return;
      }

      const payload = new globalThis.FormData();
      payload.set("file", reviewFile);
      payload.set("abstractTitle", formData.abstractTitle.trim() || t("abstractTitle"));
      payload.set("language", i18n.language === "ua" || i18n.language === "uk" ? "ua" : "en");

      const response = await fetch("/api/review-abstract", { method: "POST", body: payload });
      const result = (await response.json()) as ReviewResult;

      if (!response.ok || !result.success) {
        setReviewError(result.error || t("dashboardReviewError"));
        return;
      }

      setReviewResult(result);

      const aiPayload = {
        ai_score: result.score ?? null,
        ai_summary: result.summary ?? null,
        ai_issues: result.issues ?? [],
        ai_recommendations: result.recommendations ?? [],
        ai_formatting_issues: result.formattingIssues ?? [],
        file_path: uploaded.path
      };

      const keepStatus =
        latestSubmission?.status === "needs_revision" ? "needs_revision" : SUBMISSION_STATUS_DRAFT;

      const { error: updateError } = await supabase
        .from("submissions")
        .update({ ...buildSubmissionPayload(formData), ...aiPayload, status: keepStatus })
        .eq("id", upserted.id);

      if (updateError) {
        console.log("dashboard save ai review error:", updateError);
      }

      await loadLatestSubmission(userId);
    } catch {
      setReviewError(t("dashboardReviewError"));
    } finally {
      setIsCheckingWithAi(false);
    }
  };

  const handleSubmitForReview = async () => {
    setSubmitForReviewError(null);
    setSubmitForReviewSuccess(null);

    if (!userId || !reviewResult) {
      setSubmitForReviewError(t("dashboardSubmissionAuthError"));
      return;
    }

    if (submissionLocked) {
      setSubmitForReviewError(t("dashboardSubmissionLockedNotice"));
      return;
    }

    const score = typeof reviewResult.score === "number" ? reviewResult.score : null;
    if (score === null || score < 7) {
      setSubmitForReviewError(t("dashboardReviewNeedsImprovement"));
      return;
    }

    if (!reviewFile && !latestSubmission?.file_path) {
      setSubmitForReviewError(t("dashboardReviewUploadRequired"));
      return;
    }

    setIsSubmittingForReview(true);
    try {
      const upserted = await upsertEditableSubmission(formData);
      if ("error" in upserted) {
        setSubmitForReviewError(t("dashboardSubmitForReviewError"));
        return;
      }

      let filePath = latestSubmission?.file_path ?? null;
      if (reviewFile) {
        const uploaded = await uploadAbstractFile(reviewFile, upserted.id);
        if ("error" in uploaded) {
          setSubmitForReviewError(t("dashboardReviewUploadError"));
          return;
        }
        filePath = uploaded.path;
      }

      const { error: updateError } = await supabase
        .from("submissions")
        .update({
          ...buildSubmissionPayload(formData),
          status: SUBMISSION_STATUS_PENDING_REVIEW,
          file_path: filePath,
          ai_score: reviewResult.score ?? null,
          ai_summary: reviewResult.summary ?? null,
          ai_issues: reviewResult.issues ?? [],
          ai_recommendations: reviewResult.recommendations ?? [],
          ai_formatting_issues: reviewResult.formattingIssues ?? []
        })
        .eq("id", upserted.id);

      if (updateError) {
        console.log("dashboard submit for review error:", updateError);
        setSubmitForReviewError(t("dashboardSubmitForReviewError"));
        return;
      }

      setSubmitForReviewSuccess(t("dashboardSubmitForReviewSuccess"));
      setReviewFile(null);
      setReviewInputKey((prev) => prev + 1);
      await loadLatestSubmission(userId);
    } catch {
      setSubmitForReviewError(t("dashboardSubmitForReviewError"));
    } finally {
      setIsSubmittingForReview(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  const score = typeof reviewResult?.score === "number" ? reviewResult.score : null;
  const scoreMax = typeof reviewResult?.scoreMax === "number" ? reviewResult.scoreMax : 10;
  const scorePercent = score !== null ? Math.max(0, Math.min(100, (score / scoreMax) * 100)) : 0;
  const canSubmitForReview = submissionEditable && score !== null && score >= 7;
  const showAiReport = reviewResult !== null && (reviewResult.score !== undefined || !!reviewResult.summary);

  const progressStage = useMemo(() => {
    if (displayStatus === "accepted" || displayStatus === "rejected") {
      return 3;
    }
    if (displayStatus === "under_review" || displayStatus === "needs_revision") {
      return 2;
    }
    if (displayStatus === "ai_check") {
      return 1;
    }
    return 0;
  }, [displayStatus]);

  const progressPercent = (progressStage / 3) * 100;
  const isFinalAccepted = displayStatus === "accepted";
  const isFinalRejected = displayStatus === "rejected";
  const progressActiveColorClass = isFinalAccepted ? "bg-emerald-500" : isFinalRejected ? "bg-rose-500" : "bg-[#4F46E5]";
  const progressStages = [
    t("dashboardStatusDraft"),
    t("dashboardStatusAiCheck"),
    t("dashboardStatusOrganizerReview"),
    t("dashboardStatusFinalDecision")
  ];

  return (
    <main className="min-h-screen bg-[#f8f9ff] py-10 md:py-14">
      <div className="container">
        <div className="mx-auto mt-2 max-w-5xl space-y-6 pb-10 md:mt-4">
          <Card className={dashboardCardClass}>
            <CardHeader>
              <CardTitle className="text-3xl text-[#0f2347]">{t("dashboardTitle")}</CardTitle>
              <CardDescription className="text-gray-600">{t("dashboardSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {isLoading && <p className="text-gray-600">{t("dashboardLoading")}</p>}
              {!isLoading && error && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
              )}
              {!isLoading && !error && profile && (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className={dashboardPanelClass}>
                    <p className="text-xs uppercase tracking-wide text-gray-500">{t("firstName")}</p>
                    <p className="mt-1 text-lg font-semibold text-[#0f2347]">{profile.first_name || "-"}</p>
                  </div>
                  <div className={dashboardPanelClass}>
                    <p className="text-xs uppercase tracking-wide text-gray-500">{t("lastName")}</p>
                    <p className="mt-1 text-lg font-semibold text-[#0f2347]">{profile.last_name || "-"}</p>
                  </div>
                  <div className={dashboardPanelClass}>
                    <p className="text-xs uppercase tracking-wide text-gray-500">{t("institution")}</p>
                    <p className="mt-1 text-lg font-semibold text-[#0f2347]">{profile.institution || "-"}</p>
                  </div>
                </div>
              )}
              {!isLoading && !error && (
                <div className={dashboardPanelClass}>
                  <p className="text-sm font-semibold text-[#0f2347]">{t("dashboardStatusProgressTitle")}</p>
                  <div className="mt-4">
                    <div className="relative h-2 rounded-full bg-slate-200">
                      <div
                        className={`absolute left-0 top-0 h-2 rounded-full transition-all ${progressActiveColorClass}`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-4">
                      {progressStages.map((stageLabel, idx) => {
                        const isActive = idx <= progressStage;
                        const stageDotColorClass = isActive ? progressActiveColorClass : "bg-slate-400";
                        return (
                          <div key={stageLabel} className="flex items-start gap-2">
                            <span className={`mt-0.5 h-3 w-3 rounded-full ${stageDotColorClass}`} />
                            <span className={`text-xs ${isActive ? "font-medium text-[#0f2347]" : "text-gray-500"}`}>
                              {stageLabel}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              {!isLoading && !error && !profile && <p className="text-gray-600">{t("dashboardNoProfile")}</p>}
              <Button type="button" variant="cta" onClick={handleLogout}>
                {t("logout")}
              </Button>
            </CardContent>
          </Card>

          <Card className={dashboardCardClass}>
            <CardHeader>
              <CardTitle className="text-2xl text-[#0f2347]">{t("dashboardSubmissionTitle")}</CardTitle>
              <CardDescription className="text-gray-600">{t("dashboardSubmissionSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                <span className="text-sm font-medium text-gray-600">{t("dashboardStatusBadgeLabel")}:</span>
                <span className={participantStatusBadgeClass(displayStatus)}>{t(displayStatusKey)}</span>
              </div>

              {submissionLocked && (
                <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {t("dashboardSubmissionLockedNotice")}
                </div>
              )}

              {formError && (
                <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</div>
              )}

              <fieldset disabled={!submissionEditable} className="min-w-0 space-y-5 border-0 p-0">
                <form onSubmit={handleFormSubmit} className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className={labelClass}>{t("abstractTitle")}</label>
                      <input
                        className={inputClass}
                        value={formData.abstractTitle}
                        onChange={(e) => updateField("abstractTitle", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>{t("faculty")}</label>
                      <input className={inputClass} value={formData.faculty} onChange={(e) => updateField("faculty", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className={labelClass}>{t("specialty")}</label>
                      <input
                        className={inputClass}
                        value={formData.specialty}
                        onChange={(e) => updateField("specialty", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>{t("group")}</label>
                      <input className={inputClass} value={formData.group} onChange={(e) => updateField("group", e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>{t("yearOfStudy")}</label>
                      <select className={inputClass} value={formData.yearOfStudy} onChange={(e) => updateField("yearOfStudy", e.target.value)}>
                        <option value="" className="bg-white">
                          --
                        </option>
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <option key={n} value={String(n)} className="bg-white">
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className={labelClass}>{t("country")}</label>
                      <select className={inputClass} value={formData.country} onChange={(e) => updateField("country", e.target.value)}>
                        <option value="" className="bg-white">
                          --
                        </option>
                        <option value="ua" className="bg-white">
                          {t("countryUkraine")}
                        </option>
                        <option value="pl" className="bg-white">
                          {t("countryPoland")}
                        </option>
                        <option value="de" className="bg-white">
                          {t("countryGermany")}
                        </option>
                        <option value="fr" className="bg-white">
                          {t("countryFrance")}
                        </option>
                        <option value="gb" className="bg-white">
                          {t("countryUnitedKingdom")}
                        </option>
                        <option value="us" className="bg-white">
                          {t("countryUnitedStates")}
                        </option>
                        <option value="ca" className="bg-white">
                          {t("countryCanada")}
                        </option>
                        <option value="other" className="bg-white">
                          {t("countryOther")}
                        </option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>{t("phone")}</label>
                      <input className={inputClass} value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>{t("abstractLanguage")}</label>
                      <select
                        className={inputClass}
                        value={formData.abstractLanguage}
                        onChange={(e) => updateField("abstractLanguage", e.target.value)}
                      >
                        <option value="" className="bg-white">
                          --
                        </option>
                        <option value="ukrainian" className="bg-white">
                          {t("abstractLanguageUkrainian")}
                        </option>
                        <option value="english" className="bg-white">
                          {t("abstractLanguageEnglish")}
                        </option>
                        <option value="german" className="bg-white">
                          {t("abstractLanguageGerman")}
                        </option>
                        <option value="polish" className="bg-white">
                          {t("abstractLanguagePolish")}
                        </option>
                        <option value="czech" className="bg-white">
                          {t("abstractLanguageCzech")}
                        </option>
                        <option value="french" className="bg-white">
                          {t("abstractLanguageFrench")}
                        </option>
                        <option value="spanish" className="bg-white">
                          {t("abstractLanguageSpanish")}
                        </option>
                        <option value="italian" className="bg-white">
                          {t("abstractLanguageItalian")}
                        </option>
                        <option value="portuguese" className="bg-white">
                          {t("abstractLanguagePortuguese")}
                        </option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>{t("thematicPanel")}</label>
                    <select className={inputClass} value={formData.thematicPanel} onChange={(e) => updateField("thematicPanel", e.target.value)}>
                      <option value="" className="bg-white">
                        --
                      </option>
                      {sections.map((sec) => (
                        <option key={sec.id} value={sec.id} className="bg-white">
                          {sectionLabel(sec, i18n.language)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>{t("supervisorName")}</label>
                    <input
                      className={inputClass}
                      value={formData.supervisorName}
                      onChange={(e) => updateField("supervisorName", e.target.value)}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className={labelClass}>{t("supervisorTitleDegree")}</label>
                      <input
                        className={inputClass}
                        value={formData.supervisorTitleDegree}
                        onChange={(e) => updateField("supervisorTitleDegree", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>{t("supervisorPosition")}</label>
                      <input
                        className={inputClass}
                        value={formData.supervisorPosition}
                        onChange={(e) => updateField("supervisorPosition", e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <p className={labelClass}>{t("hasPresentation")}</p>
                    <div className="mt-2 flex flex-wrap gap-4 rounded-2xl border border-[rgba(15,35,71,0.1)] bg-white p-4">
                      <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                          type="radio"
                          name="hasPresentation"
                          value="yes"
                          checked={formData.hasPresentation === "yes"}
                          onChange={(e) => updateField("hasPresentation", e.target.value)}
                        />
                        {t("presentationYes")}
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                          type="radio"
                          name="hasPresentation"
                          value="no"
                          checked={formData.hasPresentation === "no"}
                          onChange={(e) => updateField("hasPresentation", e.target.value)}
                        />
                        {t("presentationNo")}
                      </label>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[rgba(15,35,71,0.1)] bg-white p-5">
                    <h3 className="text-lg font-semibold text-[#0f2347]">{t("dashboardReviewTitle")}</h3>
                    <p className="mt-1 text-sm text-gray-600">{t("dashboardReviewSubtitle")}</p>
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className={labelClass}>{t("dashboardReviewFileLabel")}</label>
                        <input
                          key={reviewInputKey}
                          type="file"
                          className={`${inputClass} h-auto py-2 file:mr-3 file:rounded file:border-0 file:bg-[#4F46E5] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white`}
                          accept=".docx,.pdf"
                          onChange={(e) => handleReviewFileChange(e.target.files?.[0] ?? null)}
                        />
                        <p className="mt-1 text-xs text-gray-500">{t("dashboardReviewFileHint")}</p>
                      </div>
                      {submissionEditable && (
                        <Button
                          type="button"
                          size="lg"
                          variant="cta"
                          className="w-full md:w-auto"
                          onClick={handleCheckWithAi}
                          disabled={isCheckingWithAi}
                        >
                          {isCheckingWithAi ? t("dashboardReviewChecking") : t("dashboardReviewCheckButton")}
                        </Button>
                      )}
                    </div>

                    {reviewError && (
                      <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{reviewError}</div>
                    )}

                    {showAiReport && reviewResult && (
                      <div className="mt-4 space-y-4 rounded-2xl border border-[rgba(15,35,71,0.1)] bg-[#f8f9ff] p-4">
                        <h4 className="text-base font-semibold text-[#0f2347]">{t("dashboardReviewResultTitle")}</h4>
                        {reviewResult.fileName && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium text-gray-700">{t("dashboardReviewFileName")}:</span> {reviewResult.fileName}
                          </p>
                        )}
                        {score !== null && (
                          <div className="space-y-3">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">{t("dashboardReviewScore")}:</span> {score}/{scoreMax}
                            </p>
                            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${scorePercent}%` }} />
                            </div>
                          </div>
                        )}
                        {score !== null && !canSubmitForReview && submissionEditable && (
                          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                            {t("dashboardReviewNeedsImprovement")}
                          </div>
                        )}
                        {score !== null && canSubmitForReview && (
                          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                            {t("dashboardReviewReadyForSubmit")}
                          </div>
                        )}
                        {reviewResult.summary && <p className="text-sm text-gray-600">{reviewResult.summary}</p>}
                        <p className="mt-2 text-sm font-medium text-emerald-700">
                          ✓ Primary plagiarism check: {reviewResult.plagiarismWarning ?? "no indicators detected"}
                        </p>
                        {!!reviewResult.issues?.length && (
                          <div>
                            <p className="text-sm font-medium text-gray-700">{t("dashboardReviewIssues")}:</p>
                            <ul className="list-disc pl-5 text-sm text-gray-600">
                              {reviewResult.issues.map((item, idx) => (
                                <li key={`issue-${idx}`}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {!!reviewResult.recommendations?.length && (
                          <div>
                            <p className="text-sm font-medium text-gray-700">{t("dashboardReviewRecommendations")}:</p>
                            <ul className="list-disc pl-5 text-sm text-gray-600">
                              {reviewResult.recommendations.map((item, idx) => (
                                <li key={`rec-${idx}`}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {!!reviewResult.formattingIssues?.length && (
                          <div>
                            <p className="text-sm font-medium text-gray-700">{t("dashboardReviewFormattingIssues")}:</p>
                            <ul className="list-disc pl-5 text-sm text-gray-600">
                              {reviewResult.formattingIssues.map((item, idx) => (
                                <li key={`fmt-${idx}`}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {reviewResult.motivationalMessage && (
                          <p className="text-sm text-gray-600">{reviewResult.motivationalMessage}</p>
                        )}

                        {submitForReviewError && (
                          <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {submitForReviewError}
                          </div>
                        )}
                        {submitForReviewSuccess && (
                          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                            {submitForReviewSuccess}
                          </div>
                        )}

                        {submissionEditable && (
                          <>
                            {!canSubmitForReview ? (
                              <Button
                                type="button"
                                size="lg"
                                variant="outline"
                                className="public-tech-outline-btn w-full md:w-auto"
                                onClick={handleResetReviewFile}
                              >
                                {t("dashboardReviewUploadNewVersion")}
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="lg"
                                className="w-full bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-[0_0_20px_rgba(16,185,129,0.35)] md:w-auto"
                                onClick={handleSubmitForReview}
                                disabled={isSubmittingForReview}
                              >
                                {t("dashboardSubmitForReview")}
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </form>
              </fieldset>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
