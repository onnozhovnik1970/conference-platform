"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import "@/lib/i18n/config";

type ParticipationType = "free" | "paid" | "";

type FormData = {
  lastName: string;
  firstName: string;
  middleName: string;
  institution: string;
  position: string;
  country: string;
  email: string;
  phone: string;
  conference: string;
  section: string;
  participationType: ParticipationType;
};

const initialForm: FormData = {
  lastName: "",
  firstName: "",
  middleName: "",
  institution: "",
  position: "",
  country: "",
  email: "",
  phone: "",
  conference: "",
  section: "",
  participationType: ""
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

  const conferences = useMemo(
    () => [
      { value: "psyedu-2026", label: t("conferencePsychology") },
      { value: "econmgmt-2026", label: t("conferenceEconomics") },
      { value: "philcult-2026", label: t("conferencePhilology") }
    ],
    [t]
  );

  const sections = useMemo(
    () => [
      { value: "psychology", label: t("sectionPsychology") },
      { value: "pedagogy", label: t("sectionPedagogy") },
      { value: "economics", label: t("sectionEconomics") },
      { value: "philology", label: t("sectionPhilology") },
      { value: "law", label: t("sectionLaw") },
      { value: "it", label: t("sectionIT") },
      { value: "other", label: t("sectionOther") }
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
          <header className="flex items-center justify-between">
            <Link href="/" className="text-lg font-semibold tracking-tight text-white">
              {t("navBrand")}
            </Link>
            <div className="flex items-center gap-3">
              <Button asChild variant="secondary" size="sm">
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

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className={labelClass}>{t("institution")}</label>
                      <input
                        className={inputClass}
                        value={formData.institution}
                        onChange={(e) => updateField("institution", e.target.value)}
                      />
                      {errors.institution && <p className="mt-1 text-xs text-rose-300">{errors.institution}</p>}
                    </div>
                    <div>
                      <label className={labelClass}>{t("position")}</label>
                      <input className={inputClass} value={formData.position} onChange={(e) => updateField("position", e.target.value)} />
                      {errors.position && <p className="mt-1 text-xs text-rose-300">{errors.position}</p>}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
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
                    <div>
                      <label className={labelClass}>{t("phone")}</label>
                      <input className={inputClass} value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} />
                      {errors.phone && <p className="mt-1 text-xs text-rose-300">{errors.phone}</p>}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className={labelClass}>{t("conference")}</label>
                      <select className={inputClass} value={formData.conference} onChange={(e) => updateField("conference", e.target.value)}>
                        <option value="" className="bg-slate-900">
                          --
                        </option>
                        {conferences.map((conference) => (
                          <option key={conference.value} value={conference.value} className="bg-slate-900">
                            {conference.label}
                          </option>
                        ))}
                      </select>
                      {errors.conference && <p className="mt-1 text-xs text-rose-300">{errors.conference}</p>}
                    </div>

                    <div>
                      <label className={labelClass}>{t("section")}</label>
                      <select className={inputClass} value={formData.section} onChange={(e) => updateField("section", e.target.value)}>
                        <option value="" className="bg-slate-900">
                          --
                        </option>
                        {sections.map((section) => (
                          <option key={section.value} value={section.value} className="bg-slate-900">
                            {section.label}
                          </option>
                        ))}
                      </select>
                      {errors.section && <p className="mt-1 text-xs text-rose-300">{errors.section}</p>}
                    </div>
                  </div>

                  <div>
                    <p className={labelClass}>{t("participationType")}</p>
                    <div className="mt-2 flex flex-wrap gap-4 rounded-md border border-white/20 bg-white/5 p-4">
                      <label className="flex items-center gap-2 text-sm text-slate-100">
                        <input
                          type="radio"
                          name="participationType"
                          value="free"
                          checked={formData.participationType === "free"}
                          onChange={(e) => updateField("participationType", e.target.value)}
                        />
                        {t("participationFree")}
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-100">
                        <input
                          type="radio"
                          name="participationType"
                          value="paid"
                          checked={formData.participationType === "paid"}
                          onChange={(e) => updateField("participationType", e.target.value)}
                        />
                        {t("participationPaid")}
                      </label>
                    </div>
                    {errors.participationType && <p className="mt-1 text-xs text-rose-300">{errors.participationType}</p>}
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
