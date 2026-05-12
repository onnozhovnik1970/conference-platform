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

const MIN_PASSWORD_LENGTH = 6;

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isVerifyingLink, setIsVerifyingLink] = useState(true);
  const [linkReady, setLinkReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (typeof window === "undefined") {
        return;
      }

      const hash = window.location.hash?.replace(/^#/, "") ?? "";

      if (hash) {
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        const type = params.get("type");

        if (!accessToken || !refreshToken) {
          setLinkError(t("resetPasswordInvalidLink"));
          setIsVerifyingLink(false);
          return;
        }

        if (type != null && type !== "" && type !== "recovery") {
          setLinkError(t("resetPasswordInvalidLink"));
          setIsVerifyingLink(false);
          return;
        }

        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (error) {
          setLinkError(t("resetPasswordVerifyError"));
          setIsVerifyingLink(false);
          return;
        }

        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        setLinkReady(true);
        setIsVerifyingLink(false);
        return;
      }

      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setLinkError(t("resetPasswordVerifyError"));
          setIsVerifyingLink(false);
          return;
        }
        window.history.replaceState(null, "", window.location.pathname);
        setLinkReady(true);
        setIsVerifyingLink(false);
        return;
      }

      setLinkError(t("resetPasswordInvalidLink"));
      setIsVerifyingLink(false);
    };

    void run();
    // Recovery tokens / code are consumed once from the URL; run only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- i18n `t` updates must not re-parse an already-cleared URL
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setFormError(t("resetPasswordTooShort"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError(t("passwordMismatchError"));
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setFormError(t("resetPasswordUpdateError"));
        return;
      }
      await supabase.auth.signOut();
      router.push("/login");
    } catch {
      setFormError(t("resetPasswordUpdateError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "mt-2 h-11 w-full rounded-md border border-white/20 bg-white/5 px-3 text-sm text-white placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40";
  const labelClass = "block text-sm font-medium text-slate-100";

  return (
    <main className="min-h-screen">
      <section className="animated-academic-gradient relative min-h-screen overflow-hidden py-6 md:py-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(30,58,138,0.35),_transparent_50%)]" />
        <div className="absolute inset-0 bg-[#0c1929]/40" />

        <div className="container relative z-10">
          <header className="flex items-center justify-between gap-4">
            <Link href="/" className="inline-flex items-center">
              <Image src="/knteu_logo_200.png" alt="SUTE logo" width={160} height={50} className="h-[50px] w-auto" priority />
            </Link>
            <div className="flex items-center gap-3">
              <Button asChild size="sm" variant="secondary">
                <Link href="/login">{t("navLogin")}</Link>
              </Button>
              <LanguageSwitcher />
            </div>
          </header>

          <div className="mx-auto mt-10 max-w-xl pb-10">
            <Card className="border-blue-950/60 bg-[#0f2744]/85 shadow-xl shadow-black/20 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-3xl text-white">{t("resetPasswordTitle")}</CardTitle>
                <CardDescription className="text-slate-300">{t("resetPasswordSubtitle")}</CardDescription>
              </CardHeader>
              <CardContent>
                {isVerifyingLink && (
                  <p className="text-sm text-slate-300">{t("resetPasswordVerifying")}</p>
                )}

                {!isVerifyingLink && linkError && (
                  <div className="rounded-md border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    {linkError}
                    <div className="mt-3">
                      <Button asChild variant="secondary" size="sm">
                        <Link href="/login">{t("navLogin")}</Link>
                      </Button>
                    </div>
                  </div>
                )}

                {!isVerifyingLink && linkReady && (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {formError && (
                      <div className="rounded-md border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                        {formError}
                      </div>
                    )}
                    <div>
                      <label htmlFor="new-password" className={labelClass}>
                        {t("resetPasswordNew")}
                      </label>
                      <input
                        id="new-password"
                        type="password"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        className={inputClass}
                        required
                        minLength={MIN_PASSWORD_LENGTH}
                      />
                    </div>
                    <div>
                      <label htmlFor="confirm-password" className={labelClass}>
                        {t("confirmPassword")}
                      </label>
                      <input
                        id="confirm-password"
                        type="password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        className={inputClass}
                        required
                        minLength={MIN_PASSWORD_LENGTH}
                      />
                    </div>
                    <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? t("resetPasswordSubmitting") : t("resetPasswordSubmit")}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
