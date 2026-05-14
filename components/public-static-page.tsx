"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

import { useConferenceSettings } from "@/components/conference-settings-provider";
import { Button } from "@/components/ui/button";
import { resolvedSupportPhoneDisplay, resolvedSupportPhoneTelHref, supportEmailTrimmed } from "@/lib/conference-contact-urls";
import { EDITABLE_PAGES_META, type EditablePageSlug, type PageContentRow } from "@/lib/editable-pages";
import "@/lib/i18n/config";

const staticPageMarkdownComponents: Partial<Components> = {
  p: ({ children }) => <p className="mb-4 text-sm leading-relaxed text-slate-200 last:mb-0 md:text-base">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  em: ({ children }) => <em className="italic text-slate-100">{children}</em>,
  h1: ({ children }) => (
    <h2 className="mb-3 mt-8 scroll-mt-20 text-2xl font-bold tracking-tight text-white first:mt-0">{children}</h2>
  ),
  h2: ({ children }) => (
    <h3 className="mb-2 mt-6 scroll-mt-20 text-xl font-semibold tracking-tight text-white first:mt-0">{children}</h3>
  ),
  h3: ({ children }) => (
    <h4 className="mb-2 mt-5 scroll-mt-20 text-lg font-semibold text-white first:mt-0">{children}</h4>
  ),
  h4: ({ children }) => (
    <h5 className="mb-2 mt-4 text-base font-semibold text-slate-100 first:mt-0">{children}</h5>
  ),
  ul: ({ children }) => <ul className="mb-4 ml-6 list-disc space-y-2 text-slate-200 marker:text-slate-400">{children}</ul>,
  ol: ({ children }) => (
    <ol className="mb-4 ml-6 list-decimal space-y-2 text-slate-200 marker:text-slate-400">{children}</ol>
  ),
  li: ({ children }) => <li className="pl-1 text-sm leading-relaxed md:text-base [&>p]:mb-2 [&>p:last-child]:mb-0">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="font-medium text-sky-200/90 underline decoration-sky-200/40 underline-offset-2 transition-colors hover:text-sky-100 hover:decoration-sky-100/60"
      target={href?.startsWith("/") ? undefined : "_blank"}
      rel={href?.startsWith("/") ? undefined : "noopener noreferrer"}
    >
      {children}
    </a>
  )
};

function ConferenceContactChannels() {
  const { t } = useTranslation();
  const { settings } = useConferenceSettings();
  const phoneDisplay = resolvedSupportPhoneDisplay(settings.support_phone);
  const phoneTelHref = resolvedSupportPhoneTelHref(settings.support_phone);
  const supportEmail = supportEmailTrimmed(settings.support_email);

  return (
    <>
      <p className="mt-8 text-sm text-slate-300 md:text-base">{t("contactPageLead")}</p>
      <ul className="mt-4 space-y-3 text-sm text-slate-200 md:text-base">
        <li>
          <span className="block text-xs font-medium text-slate-400">{t("phone")}</span>
          <a className="mt-0.5 inline-block text-sky-200/90 hover:underline" href={phoneTelHref}>
            {phoneDisplay}
          </a>
        </li>
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      setPage(null);
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
      } finally {
        if (!cancelled) {
          setLoading(false);
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
  const showPlaceholder = !loading && !loadError && !content;

  return (
    <main className="container max-w-3xl py-12 md:py-16">
      <h1 className="text-2xl font-bold text-white md:text-3xl">{title}</h1>
      {loadError ? <p className="mt-4 text-sm text-amber-200/90">{loadError}</p> : null}
      {loading ? (
        <div
          className="mt-10 flex justify-center py-16"
          role="status"
          aria-live="polite"
          aria-label={t("publicStaticPageLoading")}
        >
          <Loader2 className="h-9 w-9 animate-spin text-slate-400" aria-hidden />
        </div>
      ) : showPlaceholder ? (
        <p className="mt-6 text-slate-300">{t("infoPlaceholderBody")}</p>
      ) : (
        <div className="static-page-markdown mt-6 text-sm md:text-base [&_a]:break-words">
          <ReactMarkdown components={staticPageMarkdownComponents}>{rawContent}</ReactMarkdown>
        </div>
      )}
      {slug === "contact" ? <ConferenceContactChannels /> : null}
      <Button asChild className="mt-8 border-white/25 bg-white/10 text-white hover:bg-white/15" variant="outline">
        <Link href="/">{t("navHome")}</Link>
      </Button>
    </main>
  );
}
