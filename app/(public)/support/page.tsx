"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import "@/lib/i18n/config";

export default function SupportPage() {
  const { t } = useTranslation();
  const phoneTel = t("supportPhoneTel").trim();
  const phoneDisplay = t("supportPhoneDisplay").trim();
  const supportEmail = t("supportEmail").trim();

  return (
    <main className="container max-w-2xl py-12 md:py-16">
      <h1 className="text-3xl font-bold text-white">{t("pageTitleSupport")}</h1>
      <p className="mt-4 text-slate-300">{t("supportPageLead")}</p>
      <ul className="mt-8 space-y-4 text-slate-200">
        {phoneTel ? (
          <li>
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{t("phone")}</span>
            <a className="mt-1 inline-block text-lg text-sky-200 hover:underline" href={`tel:${phoneTel}`}>
              {phoneDisplay || phoneTel}
            </a>
          </li>
        ) : null}
        {supportEmail ? (
          <li>
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{t("email")}</span>
            <a className="mt-1 inline-block break-all text-lg text-sky-200 hover:underline" href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>
          </li>
        ) : null}
      </ul>
      <Button asChild className="mt-10 border-white/25 bg-white/10 text-white hover:bg-white/15" variant="outline">
        <Link href="/">{t("navHome")}</Link>
      </Button>
    </main>
  );
}
