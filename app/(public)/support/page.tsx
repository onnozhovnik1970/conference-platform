"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

import { useConferenceSettings } from "@/components/conference-settings-provider";
import { Button } from "@/components/ui/button";
import { resolvedSupportPhoneDisplay, resolvedSupportPhoneTelHref, supportEmailTrimmed } from "@/lib/conference-contact-urls";
import { publicSitePrimaryBtnClass } from "@/lib/public-site-buttons";
import { cn } from "@/lib/utils";
import "@/lib/i18n/config";

export default function SupportPage() {
  const { t } = useTranslation();
  const { settings } = useConferenceSettings();
  const phoneDisplay = resolvedSupportPhoneDisplay(settings.support_phone);
  const phoneTelHref = resolvedSupportPhoneTelHref(settings.support_phone);
  const supportEmail = supportEmailTrimmed(settings.support_email);

  return (
    <main className="container max-w-2xl py-12 md:py-16">
      <h1 className="text-2xl font-bold text-[#0F172A] md:text-3xl">{t("pageTitleSupport")}</h1>
      <p className="mt-3 text-sm text-slate-600 md:text-base">{t("supportPageLead")}</p>
      <ul className="mt-6 space-y-3 text-sm text-slate-600 md:text-base">
        <li>
          <span className="block text-xs font-medium text-slate-500">{t("phone")}</span>
          <a className="public-tech-link mt-0.5 inline-block" href={phoneTelHref}>
            {phoneDisplay}
          </a>
        </li>
        {supportEmail ? (
          <li>
            <span className="block text-xs font-medium text-slate-500">{t("email")}</span>
            <a className="public-tech-link mt-0.5 inline-block break-all" href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>
          </li>
        ) : null}
      </ul>
      <Button asChild variant="cta" className={cn("mt-8 h-auto min-h-0 border-0 shadow-none", publicSitePrimaryBtnClass)}>
        <Link href="/">{t("navHome")}</Link>
      </Button>
    </main>
  );
}
