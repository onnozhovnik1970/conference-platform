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
  const { t } = useTranslation();
  const [formData, setFormData] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

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

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitted(false);

    if (!validate()) {
      return;
    }

    setIsSubmitted(true);
    setFormData(initialForm);
    setErrors({});
  };

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const inputClass =
    "mt-2 h-11 w-full rounded-md border border-white/20 bg-white/5 px-3 text-sm text-white placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40";

  const labelClass = "block text-sm font-medium text-slate-100";

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

                  <Button type="submit" size="lg" className="w-full md:w-auto">
                    {t("registerSubmit")}
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
