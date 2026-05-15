"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import "@/lib/i18n/config";
import { supabase } from "@/lib/supabase";

type FormData = {
  lastName: string;
  firstName: string;
  middleName: string;
  institution: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const initialForm: FormData = {
  lastName: "",
  firstName: "",
  middleName: "",
  institution: "",
  email: "",
  password: "",
  confirmPassword: ""
};

export default function RegisterPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const inputClass = "public-tech-input";
  const labelClass = "public-tech-label";

  const validate = () => {
    const nextErrors: Partial<Record<keyof FormData, string>> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (const [key, value] of Object.entries(formData) as [keyof FormData, string][]) {
      if (!value.trim()) {
        nextErrors[key] = t("requiredError");
      }
    }

    if (formData.email && !emailRegex.test(formData.email)) {
      nextErrors.email = t("emailError");
    }

    if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
      nextErrors.confirmPassword = t("passwordMismatchError");
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password
      });
      if (error) {
        console.log("supabase.auth.signUp error:", error);
        setSubmitError(t("registerAuthError"));
        return;
      }

      if (!data.user?.id) {
        setSubmitError(t("registerAuthError"));
        return;
      }
      const userId = data.user.id;

      const { error: profileError } = await supabase.from("profiles").insert({
        id: userId,
        last_name: formData.lastName,
        first_name: formData.firstName,
        middle_name: formData.middleName,
        institution: formData.institution
      });
      if (profileError) {
        console.log("supabase profiles insert error:", profileError);
        setSubmitError(t("registerProfileError"));
        return;
      }

      const accessToken = data.session?.access_token;
      const welcomePayload = {
        firstName: formData.firstName.trim(),
        userId,
        email: formData.email.trim().toLowerCase()
      };

      console.log("[register] welcome email: starting fetch", {
        hasSession: Boolean(accessToken),
        userId
      });

      void fetch("/api/email/welcome-registration", {
        method: "POST",
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          "Content-Type": "application/json"
        },
        body: JSON.stringify(welcomePayload)
      })
        .then(async (res) => {
          console.log("[register] welcome email: fetch completed", {
            status: res.status,
            ok: res.ok
          });
        })
        .catch((err) => {
          console.error("[register] welcome email fetch failed:", err);
        });

      router.push("/login");
    } catch {
      setSubmitError(t("registerUnexpectedError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] py-10 md:py-14">
      <div className="container">
        <div className="mx-auto mt-2 max-w-3xl pb-10 md:mt-4">
          <Card className="public-tech-card">
            <CardHeader>
              <CardTitle className="text-3xl text-[#0F172A]">{t("registerTitle")}</CardTitle>
              <CardDescription className="text-slate-600">{t("registerSubtitle")}</CardDescription>
            </CardHeader>

              <CardContent>
                {submitError && (
                  <div className="mb-6 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {submitError}
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className={labelClass}>{t("lastName")}</label>
                      <input className={inputClass} value={formData.lastName} onChange={(e) => updateField("lastName", e.target.value)} />
                      {errors.lastName && <p className="mt-1 text-xs text-rose-600">{errors.lastName}</p>}
                    </div>
                    <div>
                      <label className={labelClass}>{t("firstName")}</label>
                      <input className={inputClass} value={formData.firstName} onChange={(e) => updateField("firstName", e.target.value)} />
                      {errors.firstName && <p className="mt-1 text-xs text-rose-600">{errors.firstName}</p>}
                    </div>
                    <div>
                      <label className={labelClass}>{t("middleName")}</label>
                      <input className={inputClass} value={formData.middleName} onChange={(e) => updateField("middleName", e.target.value)} />
                      {errors.middleName && <p className="mt-1 text-xs text-rose-600">{errors.middleName}</p>}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>{t("institution")}</label>
                    <input className={inputClass} value={formData.institution} onChange={(e) => updateField("institution", e.target.value)} />
                    {errors.institution && <p className="mt-1 text-xs text-rose-600">{errors.institution}</p>}
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className={labelClass}>{t("email")}</label>
                      <input
                        type="email"
                        className={inputClass}
                        value={formData.email}
                        onChange={(e) => updateField("email", e.target.value)}
                      />
                      {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email}</p>}
                    </div>
                    <div>
                      <label className={labelClass}>{t("password")}</label>
                      <input
                        type="password"
                        className={inputClass}
                        value={formData.password}
                        onChange={(e) => updateField("password", e.target.value)}
                      />
                      {errors.password && <p className="mt-1 text-xs text-rose-600">{errors.password}</p>}
                    </div>
                    <div>
                      <label className={labelClass}>{t("confirmPassword")}</label>
                      <input
                        type="password"
                        className={inputClass}
                        value={formData.confirmPassword}
                        onChange={(e) => updateField("confirmPassword", e.target.value)}
                      />
                      {errors.confirmPassword && <p className="mt-1 text-xs text-rose-600">{errors.confirmPassword}</p>}
                    </div>
                  </div>

                  <Button type="submit" size="lg" variant="cta" className="w-full md:w-auto" disabled={isSubmitting}>
                    {t("registerSubmit")}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
    </main>
  );
}
