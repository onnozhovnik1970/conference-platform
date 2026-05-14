"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

import { useConferenceSettings } from "@/components/conference-settings-provider";
import "@/lib/i18n/config";

function primaryConferenceTitle(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  return lines[0] ?? trimmed;
}

const FOOTER_LINKS = [
  { href: "/privacy-policy", labelKey: "siteFooterPrivacy" },
  { href: "/terms-of-use", labelKey: "siteFooterTerms" },
  { href: "/academic-integrity-policy", labelKey: "siteFooterAcademicIntegrity" },
  { href: "/ai-use-policy", labelKey: "siteFooterAiPolicy" },
  { href: "/contact", labelKey: "siteFooterContact" }
] as const;

export function SiteFooter() {
  const { t, i18n } = useTranslation();
  const { settings } = useConferenceSettings();
  const loc = i18n.language === "ua" ? "ua" : "en";
  const conferenceName =
    loc === "ua"
      ? primaryConferenceTitle(settings.title_ua?.trim() || "")
      : primaryConferenceTitle(settings.title?.trim() || "");
  const fallbackName = t("navBrand");
  const displayName = conferenceName || fallbackName;
  const yearFromDate = settings.date?.trim().slice(0, 4) ?? "";
  const year = yearFromDate && /^\d{4}$/.test(yearFromDate) ? yearFromDate : String(new Date().getFullYear());

  return (
    <footer className="mt-auto border-t border-white/10 bg-[#0a1628] py-10 text-slate-300">
      <div className="container flex flex-col gap-8">
        <p className="max-w-4xl text-sm leading-relaxed text-slate-300">{t("siteFooterCredits")}</p>

        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm" aria-label="Footer">
          {FOOTER_LINKS.map(({ href, labelKey }) => (
            <Link key={href} href={href} className="text-sky-200/90 underline-offset-4 hover:text-white hover:underline">
              {t(labelKey)}
            </Link>
          ))}
        </nav>

        <div className="border-t border-white/10 pt-6 text-center text-sm text-slate-400">
          <p className="font-medium text-slate-200">{displayName}</p>
          <p className="mt-1 text-slate-400">{year}</p>
        </div>
      </div>
    </footer>
  );
}
