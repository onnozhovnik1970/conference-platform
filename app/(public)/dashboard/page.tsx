"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

type LatestSubmissionStatus = {
  id: number;
  status: string | null;
  ai_score: number | null;
  ai_summary: string | null;
  ai_issues: string[] | null;
  ai_recommendations: string[] | null;
  ai_formatting_issues: string[] | null;
};

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

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<SubmissionForm>(initialSubmissionForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const [reviewFile, setReviewFile] = useState<File | null>(null);
  const [reviewInputKey, setReviewInputKey] = useState(0);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [isCheckingWithAi, setIsCheckingWithAi] = useState(false);

  const [isSubmittingForReview, setIsSubmittingForReview] = useState(false);
  const [submitForReviewError, setSubmitForReviewError] = useState<string | null>(null);
  const [submitForReviewSuccess, setSubmitForReviewSuccess] = useState<string | null>(null);
  const [latestSubmission, setLatestSubmission] = useState<LatestSubmissionStatus | null>(null);
  const [sections, setSections] = useState<ConferenceSectionRow[]>([]);

  const loadLatestSubmission = async (currentUserId: string) => {
    const { data: latestRows, error: latestSubmissionError } = await supabase
      .from("submissions")
      .select("id, status, ai_score, ai_summary, ai_issues, ai_recommendations, ai_formatting_issues, created_at")
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (latestSubmissionError) {
      console.log("dashboard latest submission load error:", latestSubmissionError);
      return;
    }

    const latest = (latestRows?.[0] as LatestSubmissionStatus | undefined) ?? null;
    setLatestSubmission(latest);
    if (latest === null || latest.ai_score === null) {
      return;
    }
    setReviewResult({
      score: latest.ai_score,
      scoreMax: 10,
      issues: latest.ai_issues ?? [],
      recommendations: latest.ai_recommendations ?? [],
      formattingIssues: latest.ai_formatting_issues ?? [],
      summary: latest.ai_summary ?? undefined
    });
  };

  const saveAiReviewResult = async (result: ReviewResult, canInsert: boolean) => {
    if (!userId) {
      return;
    }

    const payload = {
      ai_score: result.score ?? null,
      ai_summary: result.summary ?? null,
      ai_issues: result.issues ?? [],
      ai_recommendations: result.recommendations ?? [],
      ai_formatting_issues: result.formattingIssues ?? []
    };

    if (latestSubmission?.id) {
      const { error: updateError } = await supabase.from("submissions").update(payload).eq("id", latestSubmission.id);
      if (updateError) {
        console.log("dashboard save ai review update error:", updateError);
      }
      await loadLatestSubmission(userId);
      return;
    }

    if (!canInsert) {
      return;
    }

    const sectionMeta = sections.find((s) => s.id === formData.thematicPanel);
    const thematicPanelDb = sectionMeta?.label_en ?? formData.thematicPanel;

    const { error: insertError } = await supabase.from("submissions").insert({
      user_id: userId,
      abstract_title: formData.abstractTitle,
      faculty: formData.faculty,
      specialty: formData.specialty,
      group_name: formData.group,
      year_of_study: formData.yearOfStudy === "" ? null : Number.parseInt(formData.yearOfStudy, 10),
      country: formData.country,
      phone: formData.phone,
      abstract_language: formData.abstractLanguage,
      section_id: formData.thematicPanel || null,
      thematic_panel: thematicPanelDb,
      supervisor_name: formData.supervisorName,
      supervisor_title_degree: formData.supervisorTitleDegree,
      supervisor_position: formData.supervisorPosition,
      has_presentation: formData.hasPresentation === "" ? null : formData.hasPresentation === "yes",
      ...payload
    });

    if (insertError) {
      console.log("dashboard save ai review insert error:", insertError);
      return;
    }

    await loadLatestSubmission(userId);
  };

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
  }, [router, t]);

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

  const canStartNewSubmission =
    !isLoading &&
    (!latestSubmission ||
      latestSubmission.status === "needs_revision" ||
      latestSubmission.status === "rejected");

  const submissionBlockedNotice = !isLoading && !canStartNewSubmission;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!userId) {
      setSubmitError(t("dashboardSubmissionAuthError"));
      return;
    }

    if (!canStartNewSubmission) {
      setSubmitError(t("dashboardSubmissionBlockedActive"));
      return;
    }

    setIsSubmitting(true);
    try {
      const sectionMeta = sections.find((s) => s.id === formData.thematicPanel);
      const thematicPanelDb = sectionMeta?.label_en ?? formData.thematicPanel;

      const { error: insertError } = await supabase.from("submissions").insert({
        user_id: userId,
        abstract_title: formData.abstractTitle,
        faculty: formData.faculty,
        specialty: formData.specialty,
        group_name: formData.group,
        year_of_study: formData.yearOfStudy,
        country: formData.country,
        phone: formData.phone,
        abstract_language: formData.abstractLanguage,
        section_id: formData.thematicPanel || null,
        thematic_panel: thematicPanelDb,
        supervisor_name: formData.supervisorName,
        supervisor_title_degree: formData.supervisorTitleDegree,
        supervisor_position: formData.supervisorPosition,
        has_presentation: formData.hasPresentation
      });

      if (insertError) {
        setSubmitError(t("dashboardSubmissionError"));
        return;
      }

      setSubmitSuccess(t("dashboardSubmissionSuccess"));
      setFormData(initialSubmissionForm);
      await loadLatestSubmission(userId);
    } catch {
      setSubmitError(t("dashboardSubmissionError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewFileChange = (file: File | null) => {
    setReviewError(null);
    setReviewResult(null);
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
    setReviewResult(null);
    setSubmitForReviewError(null);
    setSubmitForReviewSuccess(null);

    if (!reviewFile) {
      setReviewError(t("dashboardReviewFileRequired"));
      return;
    }

    setIsCheckingWithAi(true);
    try {
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
      await saveAiReviewResult(result, canStartNewSubmission);
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
    if (!reviewFile) {
      setSubmitForReviewError(t("dashboardReviewUploadRequired"));
      return;
    }

    if (!canStartNewSubmission) {
      setSubmitForReviewError(t("dashboardSubmissionBlockedActive"));
      return;
    }

    const hasPresentationValue: boolean | null =
      formData.hasPresentation === "" ? null : formData.hasPresentation === "yes";
    const yearOfStudyValue = formData.yearOfStudy === "" ? null : Number.parseInt(formData.yearOfStudy, 10);

    setIsSubmittingForReview(true);
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      console.log("dashboard storage upload session:", session);
      console.log("dashboard storage upload user id:", userId);
      const fileNameParts = reviewFile.name.split(".");
      const fileExtension = fileNameParts.length > 1 ? fileNameParts[fileNameParts.length - 1].toLowerCase() : "bin";
      const storagePath = `${userId}/${Date.now()}.${fileExtension}`;
      const { error: uploadError } = await supabase.storage.from("abstracts").upload(storagePath, reviewFile, { upsert: true });

      if (uploadError) {
        console.log("dashboard storage upload error:", uploadError);
        setSubmitForReviewError(t("dashboardReviewUploadError"));
        return;
      }

      const sectionMeta = sections.find((s) => s.id === formData.thematicPanel);
      const thematicPanelDb = sectionMeta?.label_en ?? formData.thematicPanel;

      const { error: insertError } = await supabase.from("submissions").insert({
        user_id: userId,
        abstract_title: formData.abstractTitle,
        faculty: formData.faculty,
        specialty: formData.specialty,
        group_name: formData.group,
        year_of_study: yearOfStudyValue,
        country: formData.country,
        phone: formData.phone,
        abstract_language: formData.abstractLanguage,
        section_id: formData.thematicPanel || null,
        thematic_panel: thematicPanelDb,
        supervisor_name: formData.supervisorName,
        supervisor_title_degree: formData.supervisorTitleDegree,
        supervisor_position: formData.supervisorPosition,
        has_presentation: hasPresentationValue,
        status: "pending_review",
        ai_score: reviewResult.score ?? null,
        ai_summary: reviewResult.summary ?? null,
        file_path: storagePath
      });

      if (insertError) {
        console.log("dashboard submit for review error:", insertError);
        setSubmitForReviewError(t("dashboardSubmitForReviewError"));
        return;
      }

      setSubmitForReviewSuccess(t("dashboardSubmitForReviewSuccess"));
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

  const score = typeof reviewResult?.score === "number" ? reviewResult.score : null;
  const scoreMax = typeof reviewResult?.scoreMax === "number" ? reviewResult.scoreMax : 10;
  const scorePercent = score !== null ? Math.max(0, Math.min(100, (score / scoreMax) * 100)) : 0;
  const canSubmitForReview = score !== null && score >= 7;
  const latestStatus = latestSubmission?.status ?? null;
  const latestAiScore = latestSubmission?.ai_score ?? null;
  const currentProgressStage =
    latestStatus === "accepted" || latestStatus === "rejected"
      ? 3
      : latestStatus === "pending_review" && latestAiScore !== null && latestAiScore >= 8
        ? 2
        : latestStatus === "pending_review"
          ? 1
          : 0;
  const progressPercent = (currentProgressStage / 3) * 100;
  const isFinalAccepted = latestStatus === "accepted";
  const isFinalRejected = latestStatus === "rejected";
  const progressActiveColorClass = isFinalAccepted ? "bg-emerald-500" : isFinalRejected ? "bg-rose-500" : "bg-[#4F46E5]";
  const progressStages = [
    t("dashboardStatusDraft"),
    t("dashboardStatusAiReview"),
    t("dashboardStatusOrganizerReview"),
    t("dashboardStatusFinalDecision")
  ];

  return (
    <main className="min-h-screen bg-[#F8FAFC] py-10 md:py-14">
      <div className="container">
        <div className="mx-auto mt-2 max-w-5xl space-y-6 pb-10 md:mt-4">
            <Card className="public-tech-card">
              <CardHeader>
                <CardTitle className="text-3xl text-[#0F172A]">{t("dashboardTitle")}</CardTitle>
                <CardDescription className="text-slate-600">{t("dashboardSubtitle")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {isLoading && <p className="text-slate-600">{t("dashboardLoading")}</p>}
                {!isLoading && error && <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
                {!isLoading && !error && profile && (
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs uppercase tracking-wide text-slate-500">{t("firstName")}</p><p className="mt-1 text-lg font-semibold text-[#0F172A]">{profile.first_name || "-"}</p></div>
                    <div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs uppercase tracking-wide text-slate-500">{t("lastName")}</p><p className="mt-1 text-lg font-semibold text-[#0F172A]">{profile.last_name || "-"}</p></div>
                    <div className="rounded-md border border-slate-200 bg-white p-4"><p className="text-xs uppercase tracking-wide text-slate-500">{t("institution")}</p><p className="mt-1 text-lg font-semibold text-[#0F172A]">{profile.institution || "-"}</p></div>
                  </div>
                )}
                {!isLoading && !error && (
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-[#0F172A]">{t("dashboardStatusProgressTitle")}</p>
                    <div className="mt-4">
                      <div className="relative h-2 rounded-full bg-slate-200">
                        <div className={`absolute left-0 top-0 h-2 rounded-full transition-all ${progressActiveColorClass}`} style={{ width: `${progressPercent}%` }} />
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-4">
                        {progressStages.map((stageLabel, idx) => {
                          const isActive = idx <= currentProgressStage;
                          const stageDotColorClass = isActive ? progressActiveColorClass : "bg-slate-400";
                          return (
                            <div key={stageLabel} className="flex items-start gap-2">
                              <span className={`mt-0.5 h-3 w-3 rounded-full ${stageDotColorClass}`} />
                              <span className={`text-xs ${isActive ? "text-[#0F172A] font-medium" : "text-slate-500"}`}>{stageLabel}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
                {!isLoading && !error && !profile && <p className="text-slate-600">{t("dashboardNoProfile")}</p>}
                <Button type="button" variant="outline" className="public-tech-outline-btn" onClick={handleLogout}>{t("logout")}</Button>
              </CardContent>
            </Card>

            <Card className="public-tech-card">
              <CardHeader>
                <CardTitle className="text-2xl text-[#0F172A]">{t("dashboardSubmissionTitle")}</CardTitle>
                <CardDescription className="text-slate-600">{t("dashboardSubmissionSubtitle")}</CardDescription>
              </CardHeader>
              <CardContent>
                {submitError && <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{submitError}</div>}
                {submitSuccess && <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{submitSuccess}</div>}
                {submissionBlockedNotice && (
                  <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {t("dashboardSubmissionBlockedActive")}
                  </div>
                )}

                <fieldset disabled={!canStartNewSubmission} className="min-w-0 space-y-5 border-0 p-0">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div><label className={labelClass}>{t("abstractTitle")}</label><input className={inputClass} value={formData.abstractTitle} onChange={(e) => updateField("abstractTitle", e.target.value)} /></div>
                    <div><label className={labelClass}>{t("faculty")}</label><input className={inputClass} value={formData.faculty} onChange={(e) => updateField("faculty", e.target.value)} /></div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div><label className={labelClass}>{t("specialty")}</label><input className={inputClass} value={formData.specialty} onChange={(e) => updateField("specialty", e.target.value)} /></div>
                    <div><label className={labelClass}>{t("group")}</label><input className={inputClass} value={formData.group} onChange={(e) => updateField("group", e.target.value)} /></div>
                    <div>
                      <label className={labelClass}>{t("yearOfStudy")}</label>
                      <select className={inputClass} value={formData.yearOfStudy} onChange={(e) => updateField("yearOfStudy", e.target.value)}>
                        <option value="" className="bg-white">--</option>
                        {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={String(n)} className="bg-white">{n}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className={labelClass}>{t("country")}</label>
                      <select className={inputClass} value={formData.country} onChange={(e) => updateField("country", e.target.value)}>
                        <option value="" className="bg-white">--</option>
                        <option value="ua" className="bg-white">{t("countryUkraine")}</option><option value="pl" className="bg-white">{t("countryPoland")}</option><option value="de" className="bg-white">{t("countryGermany")}</option>
                        <option value="fr" className="bg-white">{t("countryFrance")}</option><option value="gb" className="bg-white">{t("countryUnitedKingdom")}</option><option value="us" className="bg-white">{t("countryUnitedStates")}</option>
                        <option value="ca" className="bg-white">{t("countryCanada")}</option><option value="other" className="bg-white">{t("countryOther")}</option>
                      </select>
                    </div>
                    <div><label className={labelClass}>{t("phone")}</label><input className={inputClass} value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} /></div>
                    <div>
                      <label className={labelClass}>{t("abstractLanguage")}</label>
                      <select className={inputClass} value={formData.abstractLanguage} onChange={(e) => updateField("abstractLanguage", e.target.value)}>
                        <option value="" className="bg-white">--</option>
                        <option value="ukrainian" className="bg-white">{t("abstractLanguageUkrainian")}</option>
                        <option value="english" className="bg-white">{t("abstractLanguageEnglish")}</option>
                        <option value="german" className="bg-white">{t("abstractLanguageGerman")}</option>
                        <option value="polish" className="bg-white">{t("abstractLanguagePolish")}</option>
                        <option value="czech" className="bg-white">{t("abstractLanguageCzech")}</option>
                        <option value="french" className="bg-white">{t("abstractLanguageFrench")}</option>
                        <option value="spanish" className="bg-white">{t("abstractLanguageSpanish")}</option>
                        <option value="italian" className="bg-white">{t("abstractLanguageItalian")}</option>
                        <option value="portuguese" className="bg-white">{t("abstractLanguagePortuguese")}</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>{t("thematicPanel")}</label>
                    <select className={inputClass} value={formData.thematicPanel} onChange={(e) => updateField("thematicPanel", e.target.value)}>
                      <option value="" className="bg-white">--</option>
                      {sections.map((sec) => (
                        <option key={sec.id} value={sec.id} className="bg-white">
                          {sectionLabel(sec, i18n.language)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div><label className={labelClass}>{t("supervisorName")}</label><input className={inputClass} value={formData.supervisorName} onChange={(e) => updateField("supervisorName", e.target.value)} /></div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div><label className={labelClass}>{t("supervisorTitleDegree")}</label><input className={inputClass} value={formData.supervisorTitleDegree} onChange={(e) => updateField("supervisorTitleDegree", e.target.value)} /></div>
                    <div><label className={labelClass}>{t("supervisorPosition")}</label><input className={inputClass} value={formData.supervisorPosition} onChange={(e) => updateField("supervisorPosition", e.target.value)} /></div>
                  </div>
                  <div>
                    <p className={labelClass}>{t("hasPresentation")}</p>
                    <div className="mt-2 flex flex-wrap gap-4 rounded-md border border-slate-200 bg-white p-4">
                      <label className="flex items-center gap-2 text-sm text-slate-700"><input type="radio" name="hasPresentation" value="yes" checked={formData.hasPresentation === "yes"} onChange={(e) => updateField("hasPresentation", e.target.value)} />{t("presentationYes")}</label>
                      <label className="flex items-center gap-2 text-sm text-slate-700"><input type="radio" name="hasPresentation" value="no" checked={formData.hasPresentation === "no"} onChange={(e) => updateField("hasPresentation", e.target.value)} />{t("presentationNo")}</label>
                    </div>
                  </div>
                  <Button type="submit" size="lg" variant="cta" className="w-full md:w-auto" disabled={isSubmitting}>{t("dashboardSubmissionSubmit")}</Button>
                </form>

                <div className="mt-8 rounded-md border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-lg font-semibold text-[#0F172A]">{t("dashboardReviewTitle")}</h3>
                  <p className="mt-1 text-sm text-slate-600">{t("dashboardReviewSubtitle")}</p>
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className={labelClass}>{t("dashboardReviewFileLabel")}</label>
                      <input key={reviewInputKey} type="file" className={`${inputClass} h-auto py-2 file:mr-3 file:rounded file:border-0 file:bg-[#4F46E5] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white`} accept=".docx,.pdf" onChange={(e) => handleReviewFileChange(e.target.files?.[0] ?? null)} />
                      <p className="mt-1 text-xs text-slate-500">{t("dashboardReviewFileHint")}</p>
                    </div>
                    <Button type="button" size="lg" variant="cta" className="w-full md:w-auto" onClick={handleCheckWithAi} disabled={isCheckingWithAi}>{isCheckingWithAi ? t("dashboardReviewChecking") : t("dashboardReviewCheckButton")}</Button>
                  </div>

                  {reviewError && <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{reviewError}</div>}
                  {reviewResult && (
                    <div className="mt-4 space-y-4 rounded-md border border-slate-200 bg-white p-4">
                      <h4 className="text-base font-semibold text-[#0F172A]">{t("dashboardReviewResultTitle")}</h4>
                      {reviewResult.fileName && <p className="text-sm text-slate-600"><span className="font-medium text-slate-800">{t("dashboardReviewFileName")}:</span> {reviewResult.fileName}</p>}
                      {score !== null && (
                        <div className="space-y-3">
                          <p className="text-sm text-slate-700">
                            <span className="font-medium">{t("dashboardReviewScore")}:</span> {score}/{scoreMax}
                          </p>
                          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${scorePercent}%` }} />
                          </div>
                        </div>
                      )}
                      {score !== null && !canSubmitForReview && (
                        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                          {t("dashboardReviewNeedsImprovement")}
                        </div>
                      )}
                      {score !== null && canSubmitForReview && (
                        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                          {t("dashboardReviewReadyForSubmit")}
                        </div>
                      )}
                      {reviewResult.summary && <p className="text-sm text-slate-600">{reviewResult.summary}</p>}
                      <p className="mt-2 text-sm font-medium text-emerald-700">
                        ✓ Primary plagiarism check: {reviewResult.plagiarismWarning ?? "no indicators detected"}
                      </p>
                      {!!reviewResult.issues?.length && (
                        <div>
                          <p className="text-sm font-medium text-slate-800">{t("dashboardReviewIssues")}:</p>
                          <ul className="list-disc pl-5 text-sm text-slate-600">
                            {reviewResult.issues.map((item, idx) => (
                              <li key={`issue-${idx}`}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {!!reviewResult.recommendations?.length && (
                        <div>
                          <p className="text-sm font-medium text-slate-800">{t("dashboardReviewRecommendations")}:</p>
                          <ul className="list-disc pl-5 text-sm text-slate-600">
                            {reviewResult.recommendations.map((item, idx) => (
                              <li key={`rec-${idx}`}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {!!reviewResult.formattingIssues?.length && (
                        <div>
                          <p className="text-sm font-medium text-slate-800">{t("dashboardReviewFormattingIssues")}:</p>
                          <ul className="list-disc pl-5 text-sm text-slate-600">
                            {reviewResult.formattingIssues.map((item, idx) => (
                              <li key={`fmt-${idx}`}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {reviewResult.motivationalMessage && <p className="text-sm text-slate-600">{reviewResult.motivationalMessage}</p>}

                      {submitForReviewError && (
                        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{submitForReviewError}</div>
                      )}
                      {submitForReviewSuccess && (
                        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{submitForReviewSuccess}</div>
                      )}
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
                        <Button type="button" size="lg" variant="cta" className="w-full md:w-auto" onClick={handleSubmitForReview} disabled={isSubmittingForReview}>
                          {t("dashboardSubmitForReview")}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                </fieldset>
              </CardContent>
            </Card>
          </div>
        </div>
    </main>
  );
}
