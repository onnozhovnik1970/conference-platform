"use client";

import Link from "next/link";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";

import { FooterSocialLinks } from "@/components/footer-social-links";
import { useConferenceSettings } from "@/components/conference-settings-provider";
import { SiteTextLogo } from "@/components/site-text-logo";
import { supportEmailTrimmed } from "@/lib/conference-contact-urls";
import "@/lib/i18n/config";

const MAIN_NAV_LINKS = [
  { href: "/", labelKey: "siteFooterHome" },
  { href: "/#about", labelKey: "siteFooterAbout" },
  { href: "/conference-program", labelKey: "siteFooterSchedule" },
  { href: "/for-authors", labelKey: "siteNavForAuthors" },
  { href: "/support", labelKey: "siteNavSupport" }
] as const;

const POLICY_NAV_LINKS = [
  { href: "/privacy-policy", labelKey: "siteFooterPrivacy" },
  { href: "/terms-of-use", labelKey: "siteFooterTerms" },
  { href: "/academic-integrity-policy", labelKey: "siteFooterAcademicIntegrity" },
  { href: "/ai-use-policy", labelKey: "siteFooterAiPolicy" },
  { href: "/contact", labelKey: "siteFooterContact" }
] as const;

const footerLinkClass =
  "whitespace-nowrap text-sky-200/90 underline-offset-4 transition-colors hover:text-white hover:underline";

function FooterNav({
  links,
  ariaLabel
}: {
  links: readonly { href: string; labelKey: string }[];
  ariaLabel: string;
}) {
  const { t } = useTranslation();

  return (
    <nav className="flex max-w-full flex-wrap justify-center gap-x-1 gap-y-2 px-2 text-sm" aria-label={ariaLabel}>
      {links.map(({ href, labelKey }, index) => (
        <Fragment key={href}>
          {index > 0 ? (
            <span className="select-none text-slate-500" aria-hidden="true">
              ·
            </span>
          ) : null}
          <Link href={href} className={footerLinkClass}>
            {t(labelKey)}
          </Link>
        </Fragment>
      ))}
    </nav>
  );
}

/** Public site footer — conference info, contact, navigation, copyright, social. */
export function Footer() {
  const { t } = useTranslation();
  const { settings } = useConferenceSettings();
  const yearFromDate = settings.date?.trim().slice(0, 4) ?? "";
  const year = yearFromDate && /^\d{4}$/.test(yearFromDate) ? yearFromDate : String(new Date().getFullYear());
  const supportEmail = supportEmailTrimmed(settings.support_email);

  return (
    <footer className="relative z-30 isolate mt-auto shrink-0 border-t border-white/10 bg-[#0a1628] py-10 text-slate-300">
      <div className="container flex flex-col items-center gap-6 text-center">
        <div className="flex flex-col items-center [&_a]:max-w-none [&_a]:items-center [&_a]:text-center">
          <SiteTextLogo />
        </div>

        <div className="mt-4 inline-block rounded-2xl border border-white/20 bg-white/10 px-6 py-3">
          <p className="text-center text-base font-semibold text-white">
            {t("siteFooterOrganizerLine1")}
            <br />
            {t("siteFooterOrganizerLine2")}
          </p>
        </div>

        <p className="text-sm text-slate-300">
          <span className="text-slate-400">{t("siteFooterEmailLabel")}: </span>
          {supportEmail ? (
            <a href={`mailto:${supportEmail}`} className={`${footerLinkClass} font-medium`}>
              {supportEmail}
            </a>
          ) : (
            <Link href="/contact" className={`${footerLinkClass} font-medium`}>
              {t("siteFooterContact")}
            </Link>
          )}
        </p>

        <FooterNav links={MAIN_NAV_LINKS} ariaLabel={t("siteFooterMainNavLabel")} />
        <FooterNav links={POLICY_NAV_LINKS} ariaLabel={t("siteFooterPolicyNavLabel")} />

        <FooterSocialLinks
          facebookUrl={settings.facebook_url}
          instagramUrl={settings.instagram_url}
          telegramUrl={settings.telegram_url}
        />

        <p className="max-w-2xl px-4 text-xs text-slate-400 sm:text-sm">{t("siteFooterCopyright", { year })}</p>

        <p className="max-w-xl px-4 text-xs leading-relaxed text-slate-500 sm:text-sm">{t("siteFooterCredits")}</p>
      </div>
    </footer>
  );
}
