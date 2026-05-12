"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

import "@/lib/i18n/config";

/**
 * Text navbar mark: SYConf + localized tagline. Matches dark / deep-blue hero sections.
 */
export function SiteTextLogo() {
  const { t } = useTranslation();

  return (
    <Link
      href="/"
      className="group flex min-w-0 max-w-[12.5rem] flex-col gap-0.5 rounded-md py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:max-w-[14rem]"
      aria-label={t("syConfLogoAria")}
    >
      <span className="font-extrabold tracking-tight text-[1.35rem] leading-none text-white drop-shadow-sm sm:text-2xl sm:leading-none">
        <span className="text-sky-200">SY</span>
        <span className="text-white">Conf</span>
      </span>
      <span className="text-[0.65rem] font-medium leading-snug text-blue-200/90 antialiased sm:text-[0.7rem] md:text-xs">
        {t("syConfTagline")}
      </span>
    </Link>
  );
}
