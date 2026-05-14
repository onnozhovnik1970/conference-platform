"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

import { useConferenceSettings } from "@/components/conference-settings-provider";
import { Button } from "@/components/ui/button";
import { supportEmailTrimmed, supportPhoneDisplay, telHrefFromSupportPhone } from "@/lib/conference-contact-urls";
import "@/lib/i18n/config";

export default function SupportPage() {
  const { t } = useTranslation();
  const { settings } = useConferenceSettings();
  const phoneDisplay = supportPhoneDisplay(settings.support_phone);
  const phoneTelHref = telHrefFromSupportPhone(settings.support_phone);
  const supportEmail = supportEmailTrimmed(settings.support_email);

  return (
    <main className="container max-w-2xl py-12 md:py-16">
      <h1 className="text-2xl font-bold text-white md:text-3xl">{t("pageTitleSupport")}</h1>
      <p className="mt-3 text-sm text-slate-300 md:text-base">{t("supportPageLead")}</p>
      <ul className="mt-6 space-y-3 text-sm text-slate-200 md:text-base">
        {phoneTelHref ? (
          <li>
            <span className="block text-xs font-medium text-slate-400">{t("phone")}</span>
            <a className="mt-0.5 inline-block text-sky-200/90 hover:underline" href={phoneTelHref}>
              {phoneDisplay || settings.support_phone?.trim()}
            </a>
          </li>
        ) : null}
        {supportEmail ? (
          <li>
            <span className="block text-xs font-medium text-slate-400">{t("email")}</span>
            <a className="mt-0.5 inline-block break-all text-sky-200/90 hover:underline" href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>
          </li>
        ) : null}
      </ul>
      <Button asChild className="mt-8 border-white/25 bg-white/10 text-white hover:bg-white/15" variant="outline">
        <Link href="/">{t("navHome")}</Link>
      </Button>
    </main>
  );
}
