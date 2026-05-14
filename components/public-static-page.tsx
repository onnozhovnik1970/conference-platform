"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useConferenceSettings } from "@/components/conference-settings-provider";
import { Button } from "@/components/ui/button";
import { supportEmailTrimmed, supportPhoneDisplay, telHrefFromSupportPhone } from "@/lib/conference-contact-urls";
import { EDITABLE_PAGES_META, type EditablePageSlug, type PageContentRow } from "@/lib/editable-pages";
import "@/lib/i18n/config";

function ConferenceContactChannels() {
  const { t } = useTranslation();
  const { settings } = useConferenceSettings();
  const phoneDisplay = supportPhoneDisplay(settings.support_phone);
  const phoneTelHref = telHrefFromSupportPhone(settings.support_phone);
  const supportEmail = supportEmailTrimmed(settings.support_email);

  return (
    <>
      <p className="mt-8 text-sm text-slate-300 md:text-base">{t("contactPageLead")}</p>
      <ul className="mt-4 space-y-3 text-sm text-slate-200 md:text-base">
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
    </>
  );
}

export function PublicStaticPage({ slug }: { slug: EditablePageSlug }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "ua" ? "ua" : "en";
  const meta = EDITABLE_PAGES_META.find((m) => m.slug === slug);
  const fallbackTitleKey = meta?.fallbackTitleKey ?? "pageTitleForAuthors";

  const [page, setPage] = useState<PageContentRow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadError(null);
      try {
        const res = await fetch(`/api/page-contents/${slug}`, { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) {
            setLoadError(t("publicStaticPageLoadError"));
          }
          return;
        }
        const json = (await res.json()) as { page: PageContentRow };
        if (!cancelled) {
          setPage(json.page);
        }
      } catch {
        if (!cancelled) {
          setLoadError(t("publicStaticPageLoadError"));
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug, t]);

  const titleUa = page?.title_ua?.trim() ?? "";
  const titleEn = page?.title_en?.trim() ?? "";
  const title =
    lang === "ua" ? (titleUa || t(fallbackTitleKey)) : titleEn || titleUa || t(fallbackTitleKey);

  const rawContent = lang === "ua" ? (page?.content_ua ?? "") : (page?.content_en ?? "");
  const content = rawContent.trim();
  const showPlaceholder = !content;

  return (
    <main className="container max-w-3xl py-12 md:py-16">
      <h1 className="text-2xl font-bold text-white md:text-3xl">{title}</h1>
      {loadError ? <p className="mt-4 text-sm text-amber-200/90">{loadError}</p> : null}
      {showPlaceholder ? (
        <p className="mt-6 text-slate-300">{t("infoPlaceholderBody")}</p>
      ) : (
        <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-slate-200 md:text-base">{rawContent}</div>
      )}
      {slug === "contact" ? <ConferenceContactChannels /> : null}
      <Button asChild className="mt-8 border-white/25 bg-white/10 text-white hover:bg-white/15" variant="outline">
        <Link href="/">{t("navHome")}</Link>
      </Button>
    </main>
  );
}
