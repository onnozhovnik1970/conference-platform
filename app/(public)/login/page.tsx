"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import "@/lib/i18n/config";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setAuthError(t("loginAuthError"));
        return;
      }
      router.push("/dashboard");
    } catch {
      setAuthError(t("loginUnexpectedError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openForgotPassword = useCallback(() => {
    setShowForgotPassword(true);
    setResetEmail(email);
    setResetSuccess(false);
    setResetError(null);
  }, [email]);

  const handleSendResetLink = async () => {
    setResetError(null);
    setResetSuccess(false);
    const trimmed = resetEmail.trim();
    if (!trimmed) {
      return;
    }
    setIsSendingReset(true);
    try {
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: 'https://conference-platform-smoky.vercel.app/reset-password'
      });
      if (error) {
        console.log(error);
        setResetError(t("loginResetLinkError"));
        return;
      }
      setResetSuccess(true);
    } catch {
      setResetError(t("loginResetLinkError"));
    } finally {
      setIsSendingReset(false);
    }
  };

  const inputClass = "public-tech-input";
  const labelClass = "public-tech-label";

  return (
    <main className="min-h-screen bg-[#F8FAFC] py-10 md:py-14">
      <div className="container">
        <div className="mx-auto mt-2 max-w-xl pb-10 md:mt-4">
          <Card className="public-tech-card">
            <CardHeader>
              <CardTitle className="text-3xl text-[#0F172A]">{t("loginTitle")}</CardTitle>
              <CardDescription className="text-slate-600">{t("loginSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {authError && (
                  <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {authError}
                  </div>
                )}
                  <div>
                    <label htmlFor="email" className={labelClass}>
                      {t("email")}
                    </label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className={inputClass}
                      placeholder={t("email")}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className={labelClass}>
                      {t("password")}
                    </label>
                    <input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className={inputClass}
                      placeholder={t("password")}
                      required
                    />
                    <button
                      type="button"
                      onClick={openForgotPassword}
                      className="public-tech-link mt-2 text-sm"
                    >
                      {t("loginForgotPassword")}
                    </button>
                  </div>

                  <Button type="submit" size="lg" variant="cta" className="w-full" disabled={isSubmitting}>
                    {t("loginSubmit")}
                  </Button>
                </form>

                {showForgotPassword && (
                  <div className="mt-6 space-y-4 border-t border-slate-200 pt-6">
                    <p className="text-sm text-slate-600">{t("loginResetPasswordHint")}</p>
                    <div>
                      <label htmlFor="reset-email" className={labelClass}>
                        {t("email")}
                      </label>
                      <input
                        id="reset-email"
                        type="email"
                        autoComplete="email"
                        value={resetEmail}
                        onChange={(event) => setResetEmail(event.target.value)}
                        className={inputClass}
                        placeholder={t("email")}
                      />
                    </div>
                    {resetError && (
                      <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {resetError}
                      </div>
                    )}
                    {resetSuccess && (
                      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        {t("loginResetLinkSuccess")}
                      </div>
                    )}
                    <Button
                      type="button"
                      size="lg"
                      variant="cta"
                      className="w-full"
                      disabled={isSendingReset || !resetEmail.trim()}
                      onClick={() => void handleSendResetLink()}
                    >
                      {isSendingReset ? t("loginResetLinkSending") : t("loginSendResetLink")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
    </main>
  );
}
