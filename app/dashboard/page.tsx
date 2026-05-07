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
  const { t } = useTranslation();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<SubmissionForm>(initialSubmissionForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
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

          <div className="mx-auto mt-10 max-w-5xl space-y-6 pb-10">
            <Card className="border-white/10 bg-black/35 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-3xl text-white">{t("dashboardTitle")}</CardTitle>
                <CardDescription className="text-slate-300">{t("dashboardSubtitle")}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">
                {isLoading && <p className="text-slate-300">{t("dashboardLoading")}</p>}

                {!isLoading && error && (
                  <div className="rounded-md border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>
                )}

                {!isLoading && !error && profile && (
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-md border border-white/15 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-400">{t("firstName")}</p>
                      <p className="mt-1 text-lg font-semibold text-white">{profile.first_name || "-"}</p>
                    </div>
                    <div className="rounded-md border border-white/15 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-400">{t("lastName")}</p>
                      <p className="mt-1 text-lg font-semibold text-white">{profile.last_name || "-"}</p>
                    </div>
                    <div className="rounded-md border border-white/15 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-400">{t("institution")}</p>
                      <p className="mt-1 text-lg font-semibold text-white">{profile.institution || "-"}</p>
                    </div>
                  </div>
                )}

                {!isLoading && !error && !profile && <p className="text-slate-300">{t("dashboardNoProfile")}</p>}

                <Button type="button" variant="outline" className="border-white text-white hover:bg-white/10" onClick={handleLogout}>
                  {t("logout")}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-black/35 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-2xl text-white">{t("dashboardSubmissionTitle")}</CardTitle>
                <CardDescription className="text-slate-300">{t("dashboardSubmissionSubtitle")}</CardDescription>
              </CardHeader>

              <CardContent>
                {submitError && (
                  <div className="mb-4 rounded-md border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{submitError}</div>
                )}
                {submitSuccess && (
                  <div className="mb-4 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                    {submitSuccess}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className={labelClass}>{t("abstractTitle")}</label>
                      <input className={inputClass} value={formData.abstractTitle} onChange={(e) => updateField("abstractTitle", e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>{t("faculty")}</label>
                      <input className={inputClass} value={formData.faculty} onChange={(e) => updateField("faculty", e.target.value)} />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className={labelClass}>{t("specialty")}</label>
                      <input className={inputClass} value={formData.specialty} onChange={(e) => updateField("specialty", e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>{t("group")}</label>
                      <input className={inputClass} value={formData.group} onChange={(e) => updateField("group", e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>{t("yearOfStudy")}</label>
                      <select className={inputClass} value={formData.yearOfStudy} onChange={(e) => updateField("yearOfStudy", e.target.value)}>
                        <option value="" className="bg-slate-900">
                          --
                        </option>
                        <option value="1" className="bg-slate-900">1</option>
                        <option value="2" className="bg-slate-900">2</option>
                        <option value="3" className="bg-slate-900">3</option>
                        <option value="4" className="bg-slate-900">4</option>
                        <option value="5" className="bg-slate-900">5</option>
                        <option value="6" className="bg-slate-900">6</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className={labelClass}>{t("country")}</label>
                      <select className={inputClass} value={formData.country} onChange={(e) => updateField("country", e.target.value)}>
                        <option value="" className="bg-slate-900">--</option>
                        <option value="ua" className="bg-slate-900">{t("countryUkraine")}</option>
                        <option value="pl" className="bg-slate-900">{t("countryPoland")}</option>
                        <option value="de" className="bg-slate-900">{t("countryGermany")}</option>
                        <option value="fr" className="bg-slate-900">{t("countryFrance")}</option>
                        <option value="gb" className="bg-slate-900">{t("countryUnitedKingdom")}</option>
                        <option value="us" className="bg-slate-900">{t("countryUnitedStates")}</option>
                        <option value="ca" className="bg-slate-900">{t("countryCanada")}</option>
                        <option value="other" className="bg-slate-900">{t("countryOther")}</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>{t("phone")}</label>
                      <input className={inputClass} value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>{t("abstractLanguage")}</label>
                      <select className={inputClass} value={formData.abstractLanguage} onChange={(e) => updateField("abstractLanguage", e.target.value)}>
                        <option value="" className="bg-slate-900">--</option>
                        <option value="ukrainian" className="bg-slate-900">{t("abstractLanguageUkrainian")}</option>
                        <option value="english" className="bg-slate-900">{t("abstractLanguageEnglish")}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>{t("thematicPanel")}</label>
                    <select className={inputClass} value={formData.thematicPanel} onChange={(e) => updateField("thematicPanel", e.target.value)}>
                      <option value="" className="bg-slate-900">--</option>
                      <option value="panel1" className="bg-slate-900">{t("panel1")}</option>
                      <option value="panel2" className="bg-slate-900">{t("panel2")}</option>
                      <option value="panel3" className="bg-slate-900">{t("panel3")}</option>
                      <option value="panel4" className="bg-slate-900">{t("panel4")}</option>
                      <option value="panel5" className="bg-slate-900">{t("panel5")}</option>
                      <option value="panel6" className="bg-slate-900">{t("panel6")}</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>{t("supervisorName")}</label>
                    <input className={inputClass} value={formData.supervisorName} onChange={(e) => updateField("supervisorName", e.target.value)} />
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
                      <input className={inputClass} value={formData.supervisorPosition} onChange={(e) => updateField("supervisorPosition", e.target.value)} />
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
                  </div>

                  <Button type="submit" size="lg" className="w-full md:w-auto" disabled={isSubmitting}>
                    {t("dashboardSubmissionSubmit")}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
