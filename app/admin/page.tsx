"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import "@/lib/i18n/config";
import { supabase } from "@/lib/supabase";

type Submission = {
  id: number;
  user_id: string;
  abstract_title: string | null;
  ai_score: number | null;
  status: string | null;
  created_at: string | null;
};

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

const ALLOWED_ADMIN_EMAILS = [
  "o.n.nozhovnik@gmail.com"
];

export default function AdminPage() {
  const { t, i18n } = useTranslation();

  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, Profile>>({});
  const [updatingSubmissionId, setUpdatingSubmissionId] = useState<number | null>(null);

  const adminEmailsSet = useMemo(() => {
    return new Set(ALLOWED_ADMIN_EMAILS.map((email) => email.trim().toLowerCase()).filter(Boolean));
  }, []);

  const loadSubmissions = async () => {
    setError(null);

    const { data: submissionRows, error: submissionsError } = await supabase
      .from("submissions")
      .select("id, user_id, abstract_title, ai_score, status, created_at")
      .order("created_at", { ascending: false });

    if (submissionsError) {
      setError(t("adminLoadError"));
      return;
    }

    const safeSubmissions = (submissionRows ?? []) as Submission[];
    setSubmissions(safeSubmissions);

    const userIds = Array.from(new Set(safeSubmissions.map((item) => item.user_id).filter(Boolean)));
    if (userIds.length === 0) {
      setProfilesById({});
      return;
    }

    const { data: profileRows, error: profilesError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", userIds);

    if (profilesError) {
      setError(t("adminProfilesLoadError"));
      return;
    }

    const profileMap = Object.fromEntries(((profileRows ?? []) as Profile[]).map((profile) => [profile.id, profile]));
    setProfilesById(profileMap);
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setIsAuthenticated(false);
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      const email = user.email?.toLowerCase() ?? "";
      console.log("admin access check user:", user);
      console.log("admin access check email:", email);
      setIsAuthenticated(true);
      if (!adminEmailsSet.has(email)) {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      setIsAuthorized(true);
      await loadSubmissions();
      setIsLoading(false);
    };

    void init();
  }, [adminEmailsSet, t]);

  const handleAdminLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    setError(null);
    setIsSubmittingLogin(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError || !data.user) {
        setAuthError(t("adminLoginAuthError"));
        return;
      }

      const normalizedEmail = data.user.email?.toLowerCase() ?? "";
      console.log("admin access check user:", data.user);
      console.log("admin access check email:", normalizedEmail);
      setIsAuthenticated(true);

      if (!adminEmailsSet.has(normalizedEmail)) {
        setIsAuthorized(false);
        return;
      }

      setIsAuthorized(true);
      setAuthError(null);
      await loadSubmissions();
    } catch {
      setAuthError(t("adminLoginUnexpectedError"));
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  const handleUpdateStatus = async (submissionId: number, status: "accepted" | "rejected") => {
    setError(null);
    setUpdatingSubmissionId(submissionId);

    const { error: updateError } = await supabase.from("submissions").update({ status }).eq("id", submissionId);

    if (updateError) {
      setError(t("adminUpdateStatusError"));
      setUpdatingSubmissionId(null);
      return;
    }

    setSubmissions((prev) => prev.map((item) => (item.id === submissionId ? { ...item, status } : item)));
    setUpdatingSubmissionId(null);
  };

  const formatStatus = (status: string | null) => {
    if (!status) {
      return t("adminStatusUnknown");
    }

    if (status === "pending_review") {
      return t("adminStatusPending");
    }
    if (status === "accepted") {
      return t("adminStatusAccepted");
    }
    if (status === "rejected") {
      return t("adminStatusRejected");
    }

    return status;
  };

  const formatDate = (value: string | null) => {
    if (!value) {
      return "-";
    }

    const locale = i18n.language === "ua" ? "uk-UA" : "en-US";
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
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

          <div className="mx-auto mt-10 max-w-6xl space-y-6 pb-10">
            <Card className="border-white/10 bg-black/35 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-3xl text-white">{t("adminTitle")}</CardTitle>
                <CardDescription className="text-slate-300">{t("adminSubtitle")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading && <p className="text-slate-300">{t("adminLoading")}</p>}

                {!isLoading && !isAuthenticated && (
                  <form onSubmit={handleAdminLogin} className="space-y-5">
                    {authError && (
                      <div className="rounded-md border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                        {authError}
                      </div>
                    )}
                    <div>
                      <label htmlFor="admin-email" className="block text-sm font-medium text-slate-100">
                        {t("email")}
                      </label>
                      <input
                        id="admin-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="mt-2 h-11 w-full rounded-md border border-white/20 bg-white/5 px-3 text-sm text-white placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                        placeholder={t("email")}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="admin-password" className="block text-sm font-medium text-slate-100">
                        {t("password")}
                      </label>
                      <input
                        id="admin-password"
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="mt-2 h-11 w-full rounded-md border border-white/20 bg-white/5 px-3 text-sm text-white placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                        placeholder={t("password")}
                        required
                      />
                    </div>
                    <Button type="submit" size="lg" className="w-full md:w-auto" disabled={isSubmittingLogin}>
                      {isSubmittingLogin ? t("adminLoginSubmitting") : t("adminLoginSubmit")}
                    </Button>
                  </form>
                )}

                {!isLoading && isAuthenticated && !isAuthorized && (
                  <div className="rounded-md border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                    {t("adminAccessDenied")}
                  </div>
                )}

                {!isLoading && isAuthorized && error && (
                  <div className="rounded-md border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                    {error}
                  </div>
                )}

                {!isLoading && isAuthorized && !error && submissions.length === 0 && (
                  <p className="text-slate-300">{t("adminNoSubmissions")}</p>
                )}

                {!isLoading && isAuthorized && submissions.length > 0 && (
                  <div className="overflow-x-auto rounded-md border border-white/15">
                    <table className="min-w-full divide-y divide-white/10 text-sm">
                      <thead className="bg-white/5">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-slate-200">{t("adminStudentName")}</th>
                          <th className="px-4 py-3 text-left font-medium text-slate-200">{t("adminAbstractTitle")}</th>
                          <th className="px-4 py-3 text-left font-medium text-slate-200">{t("adminAiScore")}</th>
                          <th className="px-4 py-3 text-left font-medium text-slate-200">{t("adminStatus")}</th>
                          <th className="px-4 py-3 text-left font-medium text-slate-200">{t("adminCreatedAt")}</th>
                          <th className="px-4 py-3 text-left font-medium text-slate-200">{t("adminActions")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10 bg-black/20">
                        {submissions.map((submission) => {
                          const profile = profilesById[submission.user_id];
                          const studentName = [profile?.last_name ?? "", profile?.first_name ?? ""].join(" ").trim() || t("adminUnknownStudent");
                          const isUpdating = updatingSubmissionId === submission.id;

                          return (
                            <tr key={submission.id}>
                              <td className="px-4 py-3 text-slate-200">{studentName}</td>
                              <td className="px-4 py-3 text-slate-200">{submission.abstract_title || "-"}</td>
                              <td className="px-4 py-3 text-slate-200">{submission.ai_score ?? "-"}</td>
                              <td className="px-4 py-3 text-slate-200">{formatStatus(submission.status)}</td>
                              <td className="px-4 py-3 text-slate-200">{formatDate(submission.created_at)}</td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => handleUpdateStatus(submission.id, "accepted")}
                                    disabled={isUpdating}
                                  >
                                    {t("adminAccept")}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="border-rose-300/60 text-rose-200 hover:bg-rose-500/10"
                                    onClick={() => handleUpdateStatus(submission.id, "rejected")}
                                    disabled={isUpdating}
                                  >
                                    {t("adminReject")}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
