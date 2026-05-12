"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "@/components/language-switcher";
import { useConferenceSettings } from "@/components/conference-settings-provider";
import { Button } from "@/components/ui/button";
import { ALLOWED_ADMIN_EMAILS } from "@/lib/admin";
import "@/lib/i18n/config";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/admin/submissions", labelKey: "adminNavSubmissions" as const },
  { href: "/admin/accepted", labelKey: "adminNavAccepted" as const },
  { href: "/admin/needs-revision", labelKey: "adminNavNeedsRevision" as const },
  { href: "/admin/rejected", labelKey: "adminNavRejected" as const },
  { href: "/admin/archive", labelKey: "adminNavArchive" as const },
  { href: "/admin/conference-settings", labelKey: "adminNavConferenceSettings" as const }
];

function NavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-slate-200 hover:bg-white/10 hover:text-white"
      )}
    >
      {label}
    </Link>
  );
}

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { settings } = useConferenceSettings();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  const adminEmailsSet = useMemo(() => {
    return new Set(ALLOWED_ADMIN_EMAILS.map((value) => value.trim().toLowerCase()).filter(Boolean));
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
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

      const userEmail = user.email?.toLowerCase() ?? "";
      setIsAuthenticated(true);
      if (!adminEmailsSet.has(userEmail)) {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      setIsAuthorized(true);
      setIsLoading(false);
    };

    void init();
  }, [adminEmailsSet]);

  const handleAdminLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    setIsSubmittingLogin(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError || !data.user) {
        setAuthError(t("adminLoginAuthError"));
        return;
      }

      const normalizedEmail = data.user.email?.toLowerCase() ?? "";
      setIsAuthenticated(true);

      if (!adminEmailsSet.has(normalizedEmail)) {
        setIsAuthorized(false);
        return;
      }

      setIsAuthorized(true);
      setAuthError(null);
    } catch {
      setAuthError(t("adminLoginUnexpectedError"));
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  const inputClass =
    "mt-2 h-11 w-full rounded-md border border-white/20 bg-white/5 px-3 text-sm text-white placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40";
  const labelClass = "block text-sm font-medium text-slate-100";

  return (
    <main className="min-h-screen">
      <section className="animated-academic-gradient relative min-h-screen overflow-hidden py-6 md:py-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.25),_transparent_45%)]" />
        <div className="container relative z-10">
          <header className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3 text-lg font-semibold tracking-tight text-white">
              <Image src="/knteu_logo_200.png" alt="SUTE logo" width={160} height={50} className="h-[50px] w-auto" priority />
              <span className="line-clamp-2 max-w-[14rem] md:max-w-md">{settings.title?.trim() || t("navBrand")}</span>
            </Link>
            <div className="flex items-center gap-3">
              <Button asChild size="sm">
                <Link href="/">{t("navHome")}</Link>
              </Button>
              <LanguageSwitcher />
            </div>
          </header>

          <div className="mx-auto mt-8 max-w-[1600px] pb-10">
            {isLoading && <p className="text-slate-300">{t("adminLoading")}</p>}

            {!isLoading && !isAuthenticated && (
              <div className="mx-auto mt-6 max-w-md rounded-lg border border-white/10 bg-black/35 p-6 backdrop-blur">
                <h2 className="text-xl font-semibold text-white">{t("adminTitle")}</h2>
                <p className="mt-1 text-sm text-slate-400">{t("adminSubtitle")}</p>
                <form onSubmit={handleAdminLogin} className="mt-6 space-y-5">
                  {authError && (
                    <div className="rounded-md border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{authError}</div>
                  )}
                  <div>
                    <label htmlFor="admin-email" className={labelClass}>
                      {t("email")}
                    </label>
                    <input
                      id="admin-email"
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
                    <label htmlFor="admin-password" className={labelClass}>
                      {t("password")}
                    </label>
                    <input
                      id="admin-password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className={inputClass}
                      placeholder={t("password")}
                      required
                    />
                  </div>
                  <Button type="submit" size="lg" className="w-full" disabled={isSubmittingLogin}>
                    {isSubmittingLogin ? t("adminLoginSubmitting") : t("adminLoginSubmit")}
                  </Button>
                </form>
              </div>
            )}

            {!isLoading && isAuthenticated && !isAuthorized && (
              <div className="mx-auto mt-6 max-w-lg rounded-md border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                {t("adminAccessDenied")}
              </div>
            )}

            {!isLoading && isAuthorized && (
              <div className="mt-6 flex flex-col gap-6 lg:flex-row">
                <aside className="w-full shrink-0 rounded-lg border border-white/10 bg-black/40 p-4 backdrop-blur lg:w-56">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{t("adminMenuTitle")}</p>
                  <nav className="flex flex-col gap-1">
                    {nav.map((item) => (
                      <NavItem key={item.href} href={item.href} label={t(item.labelKey)} />
                    ))}
                  </nav>
                </aside>
                <div className="min-w-0 flex-1">{children}</div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
