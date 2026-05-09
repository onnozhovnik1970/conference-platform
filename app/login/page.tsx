"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "@/components/language-switcher";
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

          <div className="mx-auto mt-10 max-w-xl pb-10">
            <Card className="border-white/10 bg-black/35 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-3xl text-white">{t("loginTitle")}</CardTitle>
                <CardDescription className="text-slate-300">{t("loginSubtitle")}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  {authError && (
                    <div className="rounded-md border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
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
                      className="mt-2 text-sm text-primary hover:underline"
                    >
                      {t("loginForgotPassword")}
                    </button>
                  </div>

                  <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                    {t("loginSubmit")}
                  </Button>
                </form>

                {showForgotPassword && (
                  <div className="mt-6 space-y-4 border-t border-white/10 pt-6">
                    <p className="text-sm text-slate-300">{t("loginResetPasswordHint")}</p>
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
                      <div className="rounded-md border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                        {resetError}
                      </div>
                    )}
                    {resetSuccess && (
                      <div className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                        {t("loginResetLinkSuccess")}
                      </div>
                    )}
                    <Button
                      type="button"
                      size="lg"
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
      </section>
    </main>
  );
}
