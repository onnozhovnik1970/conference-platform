"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  const inputClass =
    "mt-2 h-11 w-full rounded-md border border-white/20 bg-white/5 px-3 text-sm text-white placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40";
  const labelClass = "block text-sm font-medium text-slate-100";

  const updateField = (field: keyof SubmissionForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!userId) {
      setSubmitError(t("dashboardSubmissionAuthError"));
      return;
    }

    setIsSubmitting(true);
    try {
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
        thematic_panel: formData.thematicPanel,
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

    const hasPresentationValue: boolean | null =
      formData.hasPresentation === "" ? null : formData.hasPresentation === "true" || formData.hasPresentation === "yes";
    const yearOfStudyValue = formData.yearOfStudy === "" ? null : Number.parseInt(formData.yearOfStudy, 10);

    setIsSubmittingForReview(true);
    try {
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
        thematic_panel: formData.thematicPanel,
        supervisor_name: formData.supervisorName,
        supervisor_title_degree: formData.supervisorTitleDegree,
        supervisor_position: formData.supervisorPosition,
        has_presentation: hasPresentationValue,
        status: "pending_review",
        ai_score: reviewResult.score ?? null,
        ai_summary: reviewResult.summary ?? null
      });

      if (insertError) {
        console.log("dashboard submit for review error:", insertError);
        setSubmitForReviewError(t("dashboardSubmitForReviewError"));
        return;
      }

      setSubmitForReviewSuccess(t("dashboardSubmitForReviewSuccess"));
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
  const canSubmitForReview = score !== null && score >= 8;

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

          <div className="mx-auto mt-10 max-w-5xl space-y-6 pb-10">
            <Card className="border-white/10 bg-black/35 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-3xl text-white">{t("dashboardTitle")}</CardTitle>
                <CardDescription className="text-slate-300">{t("dashboardSubtitle")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {isLoading && <p className="text-slate-300">{t("dashboardLoading")}</p>}
                {!isLoading && error && <div className="rounded-md border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}
                {!isLoading && !error && profile && (
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-md border border-white/15 bg-white/5 p-4"><p className="text-xs uppercase tracking-wide text-slate-400">{t("firstName")}</p><p className="mt-1 text-lg font-semibold text-white">{profile.first_name || "-"}</p></div>
                    <div className="rounded-md border border-white/15 bg-white/5 p-4"><p className="text-xs uppercase tracking-wide text-slate-400">{t("lastName")}</p><p className="mt-1 text-lg font-semibold text-white">{profile.last_name || "-"}</p></div>
                    <div className="rounded-md border border-white/15 bg-white/5 p-4"><p className="text-xs uppercase tracking-wide text-slate-400">{t("institution")}</p><p className="mt-1 text-lg font-semibold text-white">{profile.institution || "-"}</p></div>
                  </div>
                )}
                {!isLoading && !error && !profile && <p className="text-slate-300">{t("dashboardNoProfile")}</p>}
                <Button type="button" variant="outline" className="border-white text-white hover:bg-white/10" onClick={handleLogout}>{t("logout")}</Button>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-black/35 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-2xl text-white">{t("dashboardSubmissionTitle")}</CardTitle>
                <CardDescription className="text-slate-300">{t("dashboardSubmissionSubtitle")}</CardDescription>
              </CardHeader>
              <CardContent>
                {submitError && <div className="mb-4 rounded-md border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{submitError}</div>}
                {submitSuccess && <div className="mb-4 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{submitSuccess}</div>}

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
                        <option value="" className="bg-slate-900">--</option>
                        {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={String(n)} className="bg-slate-900">{n}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className={labelClass}>{t("country")}</label>
                      <select className={inputClass} value={formData.country} onChange={(e) => updateField("country", e.target.value)}>
                        <option value="" className="bg-slate-900">--</option>
                        <option value="ua" className="bg-slate-900">{t("countryUkraine")}</option><option value="pl" className="bg-slate-900">{t("countryPoland")}</option><option value="de" className="bg-slate-900">{t("countryGermany")}</option>
                        <option value="fr" className="bg-slate-900">{t("countryFrance")}</option><option value="gb" className="bg-slate-900">{t("countryUnitedKingdom")}</option><option value="us" className="bg-slate-900">{t("countryUnitedStates")}</option>
                        <option value="ca" className="bg-slate-900">{t("countryCanada")}</option><option value="other" className="bg-slate-900">{t("countryOther")}</option>
                      </select>
                    </div>
                    <div><label className={labelClass}>{t("phone")}</label><input className={inputClass} value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} /></div>
                    <div>
                      <label className={labelClass}>{t("abstractLanguage")}</label>
                      <select className={inputClass} value={formData.abstractLanguage} onChange={(e) => updateField("abstractLanguage", e.target.value)}>
                        <option value="" className="bg-slate-900">--</option>
                        <option value="ukrainian" className="bg-slate-900">{t("abstractLanguageUkrainian")}</option>
                        <option value="english" className="bg-slate-900">{t("abstractLanguageEnglish")}</option>
                        <option value="german" className="bg-slate-900">{t("abstractLanguageGerman")}</option>
                        <option value="polish" className="bg-slate-900">{t("abstractLanguagePolish")}</option>
                        <option value="czech" className="bg-slate-900">{t("abstractLanguageCzech")}</option>
                        <option value="french" className="bg-slate-900">{t("abstractLanguageFrench")}</option>
                        <option value="spanish" className="bg-slate-900">{t("abstractLanguageSpanish")}</option>
                        <option value="italian" className="bg-slate-900">{t("abstractLanguageItalian")}</option>
                        <option value="portuguese" className="bg-slate-900">{t("abstractLanguagePortuguese")}</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>{t("thematicPanel")}</label>
                    <select className={inputClass} value={formData.thematicPanel} onChange={(e) => updateField("thematicPanel", e.target.value)}>
                      <option value="" className="bg-slate-900">--</option>
                      {["panel1", "panel2", "panel3", "panel4", "panel5", "panel6"].map((p) => <option key={p} value={p} className="bg-slate-900">{t(p)}</option>)}
                    </select>
                  </div>
                  <div><label className={labelClass}>{t("supervisorName")}</label><input className={inputClass} value={formData.supervisorName} onChange={(e) => updateField("supervisorName", e.target.value)} /></div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div><label className={labelClass}>{t("supervisorTitleDegree")}</label><input className={inputClass} value={formData.supervisorTitleDegree} onChange={(e) => updateField("supervisorTitleDegree", e.target.value)} /></div>
                    <div><label className={labelClass}>{t("supervisorPosition")}</label><input className={inputClass} value={formData.supervisorPosition} onChange={(e) => updateField("supervisorPosition", e.target.value)} /></div>
                  </div>
                  <div>
                    <p className={labelClass}>{t("hasPresentation")}</p>
                    <div className="mt-2 flex flex-wrap gap-4 rounded-md border border-white/20 bg-white/5 p-4">
                      <label className="flex items-center gap-2 text-sm text-slate-100"><input type="radio" name="hasPresentation" value="yes" checked={formData.hasPresentation === "yes"} onChange={(e) => updateField("hasPresentation", e.target.value)} />{t("presentationYes")}</label>
                      <label className="flex items-center gap-2 text-sm text-slate-100"><input type="radio" name="hasPresentation" value="no" checked={formData.hasPresentation === "no"} onChange={(e) => updateField("hasPresentation", e.target.value)} />{t("presentationNo")}</label>
                    </div>
                  </div>
                  <Button type="submit" size="lg" className="w-full md:w-auto" disabled={isSubmitting}>{t("dashboardSubmissionSubmit")}</Button>
                </form>

                <div className="mt-8 rounded-md border border-white/15 bg-white/5 p-5">
                  <h3 className="text-lg font-semibold text-white">{t("dashboardReviewTitle")}</h3>
                  <p className="mt-1 text-sm text-slate-300">{t("dashboardReviewSubtitle")}</p>
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className={labelClass}>{t("dashboardReviewFileLabel")}</label>
                      <input key={reviewInputKey} type="file" className={`${inputClass} h-auto py-2 file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-foreground`} accept=".docx,.pdf" onChange={(e) => handleReviewFileChange(e.target.files?.[0] ?? null)} />
                      <p className="mt-1 text-xs text-slate-400">{t("dashboardReviewFileHint")}</p>
                    </div>
                    <Button type="button" size="lg" className="w-full md:w-auto" onClick={handleCheckWithAi} disabled={isCheckingWithAi}>{isCheckingWithAi ? t("dashboardReviewChecking") : t("dashboardReviewCheckButton")}</Button>
                  </div>

                  {reviewError && <div className="mt-4 rounded-md border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{reviewError}</div>}
                  {reviewResult && (
                    <div className="mt-4 space-y-4 rounded-md border border-white/15 bg-black/25 p-4">
                      <h4 className="text-base font-semibold text-white">{t("dashboardReviewResultTitle")}</h4>
                      {reviewResult.fileName && <p className="text-sm text-slate-300"><span className="font-medium text-slate-200">{t("dashboardReviewFileName")}:</span> {reviewResult.fileName}</p>}
                      {score !== null && (
                        <div className="space-y-3">
                          <p className="text-sm text-slate-200"><span className="font-medium">{t("dashboardReviewScore")}:</span> {score}/{scoreMax}</p>
                          <div className="h-3 w-full overflow-hidden rounded-full bg-white/10"><div className="h-full bg-emerald-400 transition-all" style={{ width: `${scorePercent}%` }} /></div>
                        </div>
                      )}
                      {score !== null && !canSubmitForReview && (
                        <div className="rounded-md border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                          {t("dashboardReviewNeedsImprovement")}
                        </div>
                      )}
                      {score !== null && canSubmitForReview && (
                        <div className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                          {t("dashboardReviewReadyForSubmit")}
                        </div>
                      )}
                      {reviewResult.summary && <p className="text-sm text-slate-300">{reviewResult.summary}</p>}
                      {!!reviewResult.issues?.length && <div><p className="text-sm font-medium text-slate-200">{t("dashboardReviewIssues")}:</p><ul className="list-disc pl-5 text-sm text-slate-300">{reviewResult.issues.map((item, idx) => <li key={`issue-${idx}`}>{item}</li>)}</ul></div>}
                      {!!reviewResult.recommendations?.length && <div><p className="text-sm font-medium text-slate-200">{t("dashboardReviewRecommendations")}:</p><ul className="list-disc pl-5 text-sm text-slate-300">{reviewResult.recommendations.map((item, idx) => <li key={`rec-${idx}`}>{item}</li>)}</ul></div>}
                      {!!reviewResult.formattingIssues?.length && <div><p className="text-sm font-medium text-slate-200">{t("dashboardReviewFormattingIssues")}:</p><ul className="list-disc pl-5 text-sm text-slate-300">{reviewResult.formattingIssues.map((item, idx) => <li key={`fmt-${idx}`}>{item}</li>)}</ul></div>}
                      {reviewResult.motivationalMessage && <p className="text-sm text-slate-300">{reviewResult.motivationalMessage}</p>}

                      {submitForReviewError && <div className="rounded-md border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{submitForReviewError}</div>}
                      {submitForReviewSuccess && <div className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{submitForReviewSuccess}</div>}
                      {!canSubmitForReview ? (
                        <Button type="button" size="lg" variant="outline" className="w-full border-white text-white hover:bg-white/10 md:w-auto" onClick={handleResetReviewFile}>
                          {t("dashboardReviewUploadNewVersion")}
                        </Button>
                      ) : (
                        <Button type="button" size="lg" className="w-full md:w-auto" onClick={handleSubmitForReview} disabled={isSubmittingForReview}>
                          {t("dashboardSubmitForReview")}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
