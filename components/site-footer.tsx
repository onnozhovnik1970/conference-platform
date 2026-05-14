"use client";

import Link from "next/link";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";

import { useConferenceSettings } from "@/components/conference-settings-provider";
import { FooterSocialLinks } from "@/components/footer-social-links";
import "@/lib/i18n/config";

const FOOTER_LINKS = [
  { href: "/privacy-policy", labelKey: "siteFooterPrivacy" },
  { href: "/terms-of-use", labelKey: "siteFooterTerms" },
  { href: "/academic-integrity-policy", labelKey: "siteFooterAcademicIntegrity" },
  { href: "/ai-use-policy", labelKey: "siteFooterAiPolicy" },
  { href: "/contact", labelKey: "siteFooterContact" }
] as const;

export function SiteFooter() {
  const { t } = useTranslation();
  const { settings } = useConferenceSettings();

  return (
    <footer className="mt-auto border-t border-white/10 bg-[#0a1628] py-10 text-slate-300">
      <div className="container flex flex-col items-center gap-6 text-center">
        <p className="mx-auto max-w-3xl px-2 text-balance text-base font-semibold leading-snug text-slate-100 md:text-lg">
          {t("siteFooterDepartmentLine")}
        </p>

        <nav className="flex max-w-full flex-wrap justify-center gap-x-1 gap-y-2 px-2 text-sm" aria-label="Footer">
          {FOOTER_LINKS.map(({ href, labelKey }, index) => (
            <Fragment key={href}>
              {index > 0 ? (
                <span className="select-none text-slate-500" aria-hidden="true">
                  ·
                </span>
              ) : null}
              <Link
                href={href}
                className="whitespace-nowrap text-sky-200/90 underline-offset-4 transition-colors hover:text-white hover:underline"
              >
                {t(labelKey)}
              </Link>
            </Fragment>
          ))}
        </nav>

        <FooterSocialLinks
          facebookUrl={settings.facebook_url}
          instagramUrl={settings.instagram_url}
          telegramUrl={settings.telegram_url}
        />

        <p className="max-w-xl px-4 text-xs leading-relaxed text-slate-400 sm:text-sm">{t("siteFooterCredits")}</p>

        <div className="h-px w-full max-w-md bg-white/15" aria-hidden="true" />
      </div>
    </footer>
  );
}
