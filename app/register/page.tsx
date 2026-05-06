"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import "@/lib/i18n/config";

type PresentationType = "yes" | "no" | "";

type FormData = {
  lastName: string;
  firstName: string;
  middleName: string;
  institution: string;
  abstractTitle: string;
  faculty: string;
  specialty: string;
  yearOfStudy: string;
  group: string;
  abstractLanguage: string;
  thematicPanel: string;
  supervisorName: string;
  supervisorTitleDegree: string;
  supervisorPosition: string;
  hasPresentation: PresentationType;
  country: string;
  email: string;
  phone: string;
};

type ReviewState = {
  fileName: string;
  abstractText: string;
  correctedText_uk: string;
  correctedText_en: string;
  scoreStructure: number;
  scoreStructureMax: number;
  scoreSources: number;
  scoreSourcesMax: number;
  scoreLanguage: number;
  scoreLanguageMax: number;
  scoreContent: number;
  scoreContentMax: number;
  overallVerdict_uk: string;
  overallVerdict_en: string;
  reviewStructure_uk: string;
  reviewStructure_en: string;
  reviewSources_uk: string;
  reviewSources_en: string;
  reviewLanguage_uk: string;
  reviewLanguage_en: string;
  reviewContent_uk: string;
  reviewContent_en: string;
  aiReview: string;
  aiScore: "accepted" | "needs_revision" | "rejected";
};

const initialForm: FormData = {
  lastName: "",
  firstName: "",
  middleName: "",
  institution: "",
  abstractTitle: "",
  faculty: "",
  specialty: "",
  yearOfStudy: "",
  group: "",
  abstractLanguage: "",
  thematicPanel: "",
  supervisorName: "",
  supervisorTitleDegree: "",
  supervisorPosition: "",
  hasPresentation: "",
  country: "",
  email: "",
  phone: ""
};

export default function RegisterPage() {
  const { t, i18n } = useTranslation();
  const [formData, setFormData] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [consentGiven, setConsentGiven] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [registeredParticipantId, setRegisteredParticipantId] = useState("");
  const [submittedAbstractTitle, setSubmittedAbstractTitle] = useState("");
  const [abstractFile, setAbstractFile] = useState<File | null>(null);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewResult, setReviewResult] = useState<ReviewState | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isSubmittingAbstract, setIsSubmittingAbstract] = useState(false);

  const countries = useMemo(
    () => [
      { value: "ua", label: t("countryUkraine") },
      { value: "pl", label: t("countryPoland") },
      { value: "de", label: t("countryGermany") },
      { value: "fr", label: t("countryFrance") },
      { value: "gb", label: t("countryUnitedKingdom") },
      { value: "us", label: t("countryUnitedStates") },
      { value: "ca", label: t("countryCanada") },
      { value: "other", label: t("countryOther") }
    ],
    [t]
  );

  const years = useMemo(
    () => [
      { value: "I", label: t("yearI") },
      { value: "II", label: t("yearII") },
      { value: "III", label: t("yearIII") },
      { value: "IV", label: t("yearIV") },
      { value: "V", label: t("yearV") },
      { value: "VI", label: t("yearVI") }
    ],
    [t]
  );

  const abstractLanguages = useMemo(
    () => [
      { value: "english", label: t("abstractLanguageEnglish") },
      { value: "deutsch", label: t("abstractLanguageDeutsch") },
      { value: "francais", label: t("abstractLanguageFrancais") },
      { value: "polski", label: t("abstractLanguagePolski") },
      { value: "cestina", label: t("abstractLanguageCestina") }
    ],
    [t]
  );

  const panels = useMemo(
    () => [
      { value: "panel1", label: t("panel1") },
      { value: "panel2", label: t("panel2") },
      { value: "panel3", label: t("panel3") },
      { value: "panel4", label: t("panel4") },
      { value: "panel5", label: t("panel5") },
      { value: "panel6", label: t("panel6") }
    ],
    [t]
  );

  const validate = () => {
    const nextErrors: Partial<Record<keyof FormData, string>> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[+]?[\d\s\-()]{8,20}$/;

    for (const [key, value] of Object.entries(formData) as [keyof FormData, string][]) {
      if (!value.trim()) {
        nextErrors[key] = t("requiredError");
      }
    }

    if (formData.email && !emailRegex.test(formData.email)) {
      nextErrors.email = t("emailError");
    }

    if (formData.phone && !phoneRegex.test(formData.phone)) {
      nextErrors.phone = t("phoneError");
    }

    if (!consentGiven) {
      setConsentError(t("consentRequiredError"));
    } else {
      setConsentError(null);
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0 && consentGiven;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitted(false);
    setSubmitError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, consentToDataProcessing: consentGiven })
      });
      const result = (await response.json()) as { success: boolean; error?: string; code?: string; participantId?: string };

      if (!response.ok || !result.success) {
        if (result.code === "EMAIL_EXISTS") {
          setSubmitError(t("registerEmailExists"));
        } else {
          setSubmitError(result.error || t("registerError"));
        }
        return;
      }

      setIsSubmitted(true);
      setRegisteredParticipantId(result.participantId ?? "");
      setSubmittedAbstractTitle(formData.abstractTitle);
      setReviewTitle(formData.abstractTitle);
      setAbstractFile(null);
      setReviewResult(null);
      setReviewError(null);
      setReviewSuccess(null);
      setFormData(initialForm);
      setErrors({});
      setConsentGiven(false);
      setConsentError(null);
    } catch {
      setSubmitError(t("registerError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleReviewSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setReviewError(null);
    setReviewSuccess(null);
    setReviewResult(null);

    if (!registeredParticipantId) {
      setReviewError(t("registerError"));
      return;
    }
    if (!reviewTitle.trim()) {
      setReviewError(t("abstractTitleRequired"));
      return;
    }
    if (!abstractFile) {
      setReviewError(t("abstractFileRequired"));
      return;
    }
    const fileName = abstractFile.name.toLowerCase();
    if (!fileName.endsWith(".docx") && !fileName.endsWith(".pdf")) {
      setReviewError(t("abstractFileRequired"));
      return;
    }

    setIsReviewing(true);
    try {
      const payload = new globalThis.FormData();
      payload.set("participantId", registeredParticipantId);
      payload.set("abstractTitle", reviewTitle.trim());
      payload.set("file", abstractFile);

      const response = await fetch("/api/review-abstract", { method: "POST", body: payload });
      const result = (await response.json()) as
        | ({
            success: true;
            fileName: string;
            abstractText: string;
            correctedText_uk: string;
            correctedText_en: string;
            scoreStructure: number;
            scoreStructureMax: number;
            scoreSources: number;
            scoreSourcesMax: number;
            scoreLanguage: number;
            scoreLanguageMax: number;
            scoreContent: number;
            scoreContentMax: number;
            overallVerdict_uk: string;
            overallVerdict_en: string;
            reviewStructure_uk: string;
            reviewStructure_en: string;
            reviewSources_uk: string;
            reviewSources_en: string;
            reviewLanguage_uk: string;
            reviewLanguage_en: string;
            reviewContent_uk: string;
            reviewContent_en: string;
          })
        | { success: false; error?: string };

      if (!response.ok || !result.success) {
        setReviewError("error" in result && result.error ? result.error : t("abstractReviewError"));
        return;
      }

      const averageScore =
        (result.scoreStructure / result.scoreStructureMax +
          result.scoreSources / result.scoreSourcesMax +
          result.scoreLanguage / result.scoreLanguageMax +
          result.scoreContent / result.scoreContentMax) /
        4;
      const aiScore: ReviewState["aiScore"] = averageScore >= 0.8 ? "accepted" : averageScore >= 0.5 ? "needs_revision" : "rejected";

      setReviewResult({
        ...result,
        aiReview: [result.reviewStructure_uk, result.reviewSources_uk, result.reviewLanguage_uk, result.reviewContent_uk]
          .filter(Boolean)
          .join("\n\n"),
        aiScore
      });
      setReviewSuccess(t("abstractReviewSuccess"));
    } catch {
      setReviewError(t("abstractReviewError"));
    } finally {
      setIsReviewing(false);
    }
  };

  const handleSubmitAsIs = async () => {
    if (!reviewResult || !registeredParticipantId) return;
    setIsSubmittingAbstract(true);
    setReviewError(null);
    try {
      const response = await fetch("/api/abstract/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: registeredParticipantId,
          abstractTitle: reviewTitle.trim(),
          fileName: reviewResult.fileName,
          abstractText: reviewResult.abstractText,
          aiReview: reviewResult.aiReview,
          aiScore: reviewResult.aiScore
        })
      });
      const result = (await response.json()) as { success: boolean; error?: string };
      if (!response.ok || !result.success) {
        setReviewError(result.error || t("abstractReviewError"));
        return;
      }
      setReviewSuccess(
        isUk
          ? "Дякуємо! Ваші тези прийнято. Увійдіть в особистий кабінет щоб переглянути рецензію ШІ та подати виправлену версію."
          : "Thank you! Your abstract has been submitted. Please log in to your personal dashboard to view the AI review and submit a revised version."
      );
    } catch {
      setReviewError(t("abstractReviewError"));
    } finally {
      setIsSubmittingAbstract(false);
    }
  };

  const inputClass =
    "mt-2 h-11 w-full rounded-md border border-white/20 bg-white/5 px-3 text-sm text-white placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40";

  const labelClass = "block text-sm font-medium text-slate-100";
  const renderBlocks = (value: number, max: number) => `${"█".repeat(Math.max(0, Math.min(value, max)))}${"░".repeat(Math.max(0, max - Math.max(0, Math.min(value, max))))}`;
  const isUk = i18n.language === "uk" || i18n.language === "ua";

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

          <div className="mx-auto mt-10 max-w-4xl pb-10">
            <Card className="border-white/10 bg-black/35 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-3xl text-white">{t("registerTitle")}</CardTitle>
                <CardDescription className="text-slate-300">{t("registerSubtitle")}</CardDescription>
              </CardHeader>

              <CardContent>
                {isSubmitted && (
                  <div className="mb-6 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                    {t("registerSuccess")}
                  </div>
                )}
                {submitError && (
                  <div className="mb-6 rounded-md border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                    {submitError}
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className={labelClass}>{t("lastName")}</label>
                      <input className={inputClass} value={formData.lastName} onChange={(e) => updateField("lastName", e.target.value)} />
                      {errors.lastName && <p className="mt-1 text-xs text-rose-300">{errors.lastName}</p>}
                    </div>
                    <div>
                      <label className={labelClass}>{t("firstName")}</label>
                      <input className={inputClass} value={formData.firstName} onChange={(e) => updateField("firstName", e.target.value)} />
                      {errors.firstName && <p className="mt-1 text-xs text-rose-300">{errors.firstName}</p>}
                    </div>
                    <div>
                      <label className={labelClass}>{t("middleName")}</label>
                      <input className={inputClass} value={formData.middleName} onChange={(e) => updateField("middleName", e.target.value)} />
                      {errors.middleName && <p className="mt-1 text-xs text-rose-300">{errors.middleName}</p>}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-1">
                    <div>
                      <label className={labelClass}>{t("institution")}</label>
                      <input
                        className={inputClass}
                        value={formData.institution}
                        onChange={(e) => updateField("institution", e.target.value)}
                      />
                      {errors.institution && <p className="mt-1 text-xs text-rose-300">{errors.institution}</p>}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className={labelClass}>{t("abstractTitle")}</label>
                      <input
                        className={inputClass}
                        value={formData.abstractTitle}
                        onChange={(e) => updateField("abstractTitle", e.target.value)}
                      />
                      {errors.abstractTitle && <p className="mt-1 text-xs text-rose-300">{errors.abstractTitle}</p>}
                    </div>
                    <div>
                      <label className={labelClass}>{t("faculty")}</label>
                      <input className={inputClass} value={formData.faculty} onChange={(e) => updateField("faculty", e.target.value)} />
                      {errors.faculty && <p className="mt-1 text-xs text-rose-300">{errors.faculty}</p>}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className={labelClass}>{t("specialty")}</label>
                      <input className={inputClass} value={formData.specialty} onChange={(e) => updateField("specialty", e.target.value)} />
                      {errors.specialty && <p className="mt-1 text-xs text-rose-300">{errors.specialty}</p>}
                    </div>
                    <div>
                      <label className={labelClass}>{t("group")}</label>
                      <input className={inputClass} value={formData.group} onChange={(e) => updateField("group", e.target.value)} />
                      {errors.group && <p className="mt-1 text-xs text-rose-300">{errors.group}</p>}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-4">
                    <div>
                      <label className={labelClass}>{t("yearOfStudy")}</label>
                      <select className={inputClass} value={formData.yearOfStudy} onChange={(e) => updateField("yearOfStudy", e.target.value)}>
                        <option value="" className="bg-slate-900">
                          --
                        </option>
                        {years.map((year) => (
                          <option key={year.value} value={year.value} className="bg-slate-900">
                            {year.label}
                          </option>
                        ))}
                      </select>
                      {errors.yearOfStudy && <p className="mt-1 text-xs text-rose-300">{errors.yearOfStudy}</p>}
                    </div>
                    <div>
                      <label className={labelClass}>{t("country")}</label>
                      <select className={inputClass} value={formData.country} onChange={(e) => updateField("country", e.target.value)}>
                        <option value="" className="bg-slate-900">
                          --
                        </option>
                        {countries.map((country) => (
                          <option key={country.value} value={country.value} className="bg-slate-900">
                            {country.label}
                          </option>
                        ))}
                      </select>
                      {errors.country && <p className="mt-1 text-xs text-rose-300">{errors.country}</p>}
                    </div>
                    <div>
                      <label className={labelClass}>{t("email")}</label>
                      <input
                        type="email"
                        className={inputClass}
                        value={formData.email}
                        onChange={(e) => updateField("email", e.target.value)}
                      />
                      {errors.email && <p className="mt-1 text-xs text-rose-300">{errors.email}</p>}
                    </div>
                    <div className="md:col-span-1">
                      <label className={labelClass}>{t("phone")}</label>
                      <input className={inputClass} value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} />
                      {errors.phone && <p className="mt-1 text-xs text-rose-300">{errors.phone}</p>}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className={labelClass}>{t("abstractLanguage")}</label>
                      <select
                        className={inputClass}
                        value={formData.abstractLanguage}
                        onChange={(e) => updateField("abstractLanguage", e.target.value)}
                      >
                        <option value="" className="bg-slate-900">
                          --
                        </option>
                        {abstractLanguages.map((language) => (
                          <option key={language.value} value={language.value} className="bg-slate-900">
                            {language.label}
                          </option>
                        ))}
                      </select>
                      {errors.abstractLanguage && <p className="mt-1 text-xs text-rose-300">{errors.abstractLanguage}</p>}
                    </div>

                    <div>
                      <label className={labelClass}>{t("thematicPanel")}</label>
                      <select
                        className={inputClass}
                        value={formData.thematicPanel}
                        onChange={(e) => updateField("thematicPanel", e.target.value)}
                      >
                        <option value="" className="bg-slate-900">
                          --
                        </option>
                        {panels.map((panel) => (
                          <option key={panel.value} value={panel.value} className="bg-slate-900">
                            {panel.label}
                          </option>
                        ))}
                      </select>
                      {errors.thematicPanel && <p className="mt-1 text-xs text-rose-300">{errors.thematicPanel}</p>}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-1">
                    <div>
                      <label className={labelClass}>{t("supervisorName")}</label>
                      <input
                        className={inputClass}
                        value={formData.supervisorName}
                        onChange={(e) => updateField("supervisorName", e.target.value)}
                      />
                      {errors.supervisorName && <p className="mt-1 text-xs text-rose-300">{errors.supervisorName}</p>}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className={labelClass}>{t("supervisorTitleDegree")}</label>
                      <input
                        className={inputClass}
                        value={formData.supervisorTitleDegree}
                        onChange={(e) => updateField("supervisorTitleDegree", e.target.value)}
                      />
                      {errors.supervisorTitleDegree && <p className="mt-1 text-xs text-rose-300">{errors.supervisorTitleDegree}</p>}
                    </div>
                    <div>
                      <label className={labelClass}>{t("supervisorPosition")}</label>
                      <input
                        className={inputClass}
                        value={formData.supervisorPosition}
                        onChange={(e) => updateField("supervisorPosition", e.target.value)}
                      />
                      {errors.supervisorPosition && <p className="mt-1 text-xs text-rose-300">{errors.supervisorPosition}</p>}
                    </div>
                  </div>

                  <div>
                    <p className={labelClass}>{t("hasPresentation")}</p>
                    <div className="mt-2 flex flex-wrap gap-4 rounded-md border border-white/20 bg-white/5 p-4">
                      <label className="flex items-center gap-2 text-sm text-slate-100">
                        <input
                          type="radio"
                          name="hasPresentation"
                          value="yes"
                          checked={formData.hasPresentation === "yes"}
                          onChange={(e) => updateField("hasPresentation", e.target.value)}
                        />
                        {t("presentationYes")}
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-100">
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
                    {errors.hasPresentation && <p className="mt-1 text-xs text-rose-300">{errors.hasPresentation}</p>}
                  </div>

                  <div>
                    <label className="flex items-start gap-3 rounded-md border border-white/20 bg-white/5 p-4 text-sm text-slate-100">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={consentGiven}
                        onChange={(e) => {
                          setConsentGiven(e.target.checked);
                          if (e.target.checked) {
                            setConsentError(null);
                          }
                        }}
                      />
                      <span>{t("consentDataProcessing")}</span>
                    </label>
                    {consentError && <p className="mt-1 text-xs text-rose-300">{consentError}</p>}
                  </div>

                  <Button type="submit" size="lg" className="w-full md:w-auto" disabled={isSubmitting}>
                    {t("registerSubmit")}
                  </Button>
                </form>

                <div className="mt-10 rounded-md border border-white/15 bg-white/5 p-5">
                  <h3 className="text-xl font-semibold text-white">{t("submitAbstractTitle")}</h3>
                  <p className="mt-2 text-sm text-slate-300">{t("submitAbstractDescription")}</p>

                  {!registeredParticipantId && (
                    <div className="mt-4 rounded-md border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                      {isUk
                        ? "Спочатку заповніть та надішліть реєстраційну форму, після цього стане доступна перевірка тез."
                        : "Please submit the registration form first, then abstract AI review will be available."}
                    </div>
                  )}

                  <form onSubmit={handleReviewSubmit} className="mt-5 space-y-4">
                      <div>
                        <label className={labelClass}>{t("abstractFile")}</label>
                        <input
                          type="file"
                          accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          className={`${inputClass} h-auto py-2`}
                          onChange={(e) => setAbstractFile(e.target.files?.[0] ?? null)}
                        />
                        <p className="mt-1 text-xs text-slate-400">{t("abstractFileHint")}</p>
                      </div>

                      <div>
                        <label className={labelClass}>{t("abstractTitleForSubmission")}</label>
                        <textarea
                          className="mt-2 min-h-24 w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                          value={reviewTitle}
                          onChange={(e) => setReviewTitle(e.target.value)}
                          placeholder={submittedAbstractTitle}
                        />
                      </div>

                      <Button type="submit" size="lg" className="w-full md:w-auto" disabled={isReviewing || !registeredParticipantId}>
                        {t("abstractReviewSubmit")}
                      </Button>
                  </form>

                  {reviewSuccess && (
                    <div className="mt-4 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                      {reviewSuccess}
                    </div>
                  )}

                  {reviewError && (
                    <div className="mt-4 rounded-md border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                      {reviewError}
                    </div>
                  )}

                  {reviewResult && (
                    <div className="mt-5 rounded-md border border-[#F0A500]/40 bg-[#F0A500]/10 p-4">
                        <div className="space-y-2 text-sm text-slate-100">
                          <p>
                            <span className="font-semibold">{isUk ? "Структура" : "Structure"}:</span>{" "}
                            {renderBlocks(reviewResult.scoreStructure, reviewResult.scoreStructureMax)}{" "}
                            ({reviewResult.scoreStructure}/{reviewResult.scoreStructureMax})
                          </p>
                          <p>
                            <span className="font-semibold">{isUk ? "Джерела" : "Sources"}:</span>{" "}
                            {renderBlocks(reviewResult.scoreSources, reviewResult.scoreSourcesMax)} (
                            {reviewResult.scoreSources}/{reviewResult.scoreSourcesMax})
                          </p>
                          <p>
                            <span className="font-semibold">{isUk ? "Мова" : "Language"}:</span>{" "}
                            {renderBlocks(reviewResult.scoreLanguage, reviewResult.scoreLanguageMax)} (
                            {reviewResult.scoreLanguage}/{reviewResult.scoreLanguageMax})
                          </p>
                          <p>
                            <span className="font-semibold">{isUk ? "Зміст" : "Content"}:</span>{" "}
                            {renderBlocks(reviewResult.scoreContent, reviewResult.scoreContentMax)} (
                            {reviewResult.scoreContent}/{reviewResult.scoreContentMax})
                          </p>
                        </div>

                        <div className="mt-4 inline-flex rounded-full border border-white/30 bg-white/10 px-3 py-1 text-sm font-semibold text-white">
                          {isUk ? reviewResult.overallVerdict_uk : reviewResult.overallVerdict_en}
                        </div>

                        <div className="mt-4 space-y-3 text-sm leading-6 text-slate-100">
                          <p>
                            <span className="font-semibold">{isUk ? "Структура" : "Structure"}: </span>
                            {isUk ? reviewResult.reviewStructure_uk : reviewResult.reviewStructure_en}
                          </p>
                          <p>
                            <span className="font-semibold">{isUk ? "Джерела" : "Sources"}: </span>
                            {isUk ? reviewResult.reviewSources_uk : reviewResult.reviewSources_en}
                          </p>
                          <p>
                            <span className="font-semibold">{isUk ? "Мова" : "Language"}: </span>
                            {isUk ? reviewResult.reviewLanguage_uk : reviewResult.reviewLanguage_en}
                          </p>
                          <p>
                            <span className="font-semibold">{isUk ? "Зміст" : "Content"}: </span>
                            {isUk ? reviewResult.reviewContent_uk : reviewResult.reviewContent_en}
                          </p>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3">
                          <Button type="button" variant="secondary" onClick={handleSubmitAsIs} disabled={isSubmittingAbstract}>
                            {isUk ? "Подати тези" : "Submit Abstract"}
                          </Button>
                        </div>
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

