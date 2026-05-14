"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "@/components/language-switcher";
import { SiteTextLogo } from "@/components/site-text-logo";
import { Button } from "@/components/ui/button";
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

export function SiteHeader() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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

  const phoneTel = t("supportPhoneTel").trim();
  const phoneDisplay = t("supportPhoneDisplay").trim();
  const supportEmail = t("supportEmail").trim();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0f2347]/95 shadow-md shadow-black/20 backdrop-blur-md">
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
            {phoneTel ? (
              <a href={`tel:${phoneTel}`} className="truncate text-xs text-slate-300 hover:text-white">
                {phoneDisplay || phoneTel}
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
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen ? (
        <div
          id="site-mobile-nav"
          className="fixed inset-x-0 bottom-0 top-16 z-40 flex flex-col border-t border-white/10 bg-[#0c1a33]/98 px-4 py-5 lg:hidden"
        >
          <nav className="flex flex-col gap-1 overflow-y-auto" aria-label="Primary mobile">
            {PRIMARY_NAV.map(({ href, labelKey }) => (
              <Link key={href} href={href} className={navLinkClass(pathname === href)} onClick={() => setMobileOpen(false)}>
                {t(labelKey)}
              </Link>
            ))}
          </nav>
          <div className="mt-4 border-t border-white/10 pt-4 text-sm text-slate-200">
            <p className="font-semibold text-white">{t("siteNavSupport")}</p>
            {phoneTel ? (
              <a className="mt-1 block text-sky-200/90" href={`tel:${phoneTel}`}>
                {phoneDisplay || phoneTel}
              </a>
            ) : null}
            {supportEmail ? (
              <a className="mt-1 block break-all text-sky-200/90" href={`mailto:${supportEmail}`}>
                {supportEmail}
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}
