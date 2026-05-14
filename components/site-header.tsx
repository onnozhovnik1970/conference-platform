"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "@/components/language-switcher";
import { useConferenceSettings } from "@/components/conference-settings-provider";
import { SiteTextLogo } from "@/components/site-text-logo";
import { Button } from "@/components/ui/button";
import { supportEmailTrimmed, supportPhoneDisplay, telHrefFromSupportPhone } from "@/lib/conference-contact-urls";
import "@/lib/i18n/config";

const PRIMARY_NAV = [
  { href: "/for-authors", labelKey: "siteNavForAuthors" },
  { href: "/conference-program", labelKey: "siteNavConferenceProgram" },
  { href: "/academic-integrity-policy", labelKey: "siteNavAcademicIntegrityPolicy" },
  { href: "/ai-use-policy", labelKey: "siteNavAiUsePolicy" }
] as const;

function navLinkClass(active: boolean): string {
  return [
    "rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
    active ? "bg-white/15 text-white" : "text-slate-200 hover:bg-white/10 hover:text-white"
  ].join(" ");
}

function mobileNavLinkClass(active: boolean): string {
  return [
    "flex min-h-[3.25rem] items-center rounded-lg px-4 py-3 text-lg font-semibold leading-snug transition-colors active:bg-white/10",
    active ? "bg-white/15 text-white" : "text-white hover:bg-white/10"
  ].join(" ");
}

export function SiteHeader() {
  const { t } = useTranslation();
  const { settings } = useConferenceSettings();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMobile();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, closeMobile]);

  const phoneDisplay = supportPhoneDisplay(settings.support_phone);
  const phoneTelHref = telHrefFromSupportPhone(settings.support_phone);
  const supportEmail = supportEmailTrimmed(settings.support_email);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0f2347]/95 shadow-md shadow-black/20 backdrop-blur-md">
      <div className="relative z-[70]">
        <div className="container flex h-16 items-center justify-between gap-3 md:h-[4.25rem] md:gap-4">
          <div className="flex min-w-0 shrink-0 items-center gap-3">
            <SiteTextLogo />
          </div>

          <nav className="hidden items-center gap-1 lg:flex xl:gap-2" aria-label="Primary navigation">
            {PRIMARY_NAV.map(({ href, labelKey }) => (
              <Link key={href} href={href} className={navLinkClass(pathname === href)}>
                {t(labelKey)}
              </Link>
            ))}
            <div className="ml-2 flex max-w-[11rem] flex-col border-l border-white/15 pl-3 text-left xl:ml-3 xl:max-w-[13rem] xl:pl-4">
              <Link href="/support" className="text-sm font-semibold text-white hover:underline">
                {t("siteNavSupport")}
              </Link>
              {phoneTelHref ? (
                <a href={phoneTelHref} className="truncate text-xs text-slate-300 hover:text-white">
                  {phoneDisplay || settings.support_phone?.trim()}
                </a>
              ) : null}
              {supportEmail ? (
                <a href={`mailto:${supportEmail}`} className="truncate text-xs text-sky-200/90 hover:text-white">
                  {supportEmail}
                </a>
              ) : null}
            </div>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <LanguageSwitcher />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-9 shrink-0 border-white/25 bg-white/5 p-0 text-white hover:bg-white/10 lg:hidden"
              aria-expanded={mobileOpen}
              aria-controls="site-mobile-nav"
              aria-label={mobileOpen ? t("siteNavCloseMenu") : t("siteNavOpenMenu")}
              onClick={() => setMobileOpen((o) => !o)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {mobileOpen ? (
        <div className="lg:hidden">
          <button
            type="button"
            aria-label={t("siteNavCloseMenu")}
            className="fixed inset-x-0 bottom-0 top-16 z-[60] bg-slate-950/55 backdrop-blur-[2px] md:top-[4.25rem]"
            onClick={closeMobile}
          />
          <aside
            id="site-mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label={t("siteMobileNavDialogLabel")}
            className="fixed bottom-0 right-0 top-16 z-[65] flex w-[min(100%,22rem)] max-w-[100vw] flex-col border-l border-white/15 bg-[#0f2347] shadow-[-8px_0_24px_rgba(0,0,0,0.35)] animate-in slide-in-from-right duration-300 md:top-[4.25rem]"
          >
            <div className="flex h-14 shrink-0 items-center justify-end border-b border-white/10 bg-[#0c1d38] px-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-12 w-12 shrink-0 border-white/20 bg-white/10 p-0 text-white hover:bg-white/20 hover:text-white"
                aria-label={t("siteNavCloseMenu")}
                onClick={closeMobile}
              >
                <X className="h-7 w-7" strokeWidth={2.25} />
              </Button>
            </div>

            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4" aria-label="Primary mobile">
              {PRIMARY_NAV.map(({ href, labelKey }) => (
                <Link key={href} href={href} className={mobileNavLinkClass(pathname === href)} onClick={closeMobile}>
                  {t(labelKey)}
                </Link>
              ))}
            </nav>

            <div className="shrink-0 border-t border-white/10 bg-[#0c1d38]/90 px-4 py-4">
              <Link
                href="/support"
                className={mobileNavLinkClass(pathname === "/support")}
                onClick={closeMobile}
              >
                {t("siteNavSupport")}
              </Link>
              {phoneTelHref ? (
                <a
                  className="mt-2 block py-2 text-sm text-sky-200/90 hover:text-white"
                  href={phoneTelHref}
                  onClick={closeMobile}
                >
                  {phoneDisplay || settings.support_phone?.trim()}
                </a>
              ) : null}
              {supportEmail ? (
                <a
                  className="mt-1 block break-all py-2 text-sm text-sky-200/90 hover:text-white"
                  href={`mailto:${supportEmail}`}
                  onClick={closeMobile}
                >
                  {supportEmail}
                </a>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </header>
  );
}
