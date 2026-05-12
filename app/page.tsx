"use client";

import { Atom, BookOpen, CalendarDays, Sparkles, Video } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "@/components/language-switcher";
import { SiteTextLogo } from "@/components/site-text-logo";
import { useConferenceSettings } from "@/components/conference-settings-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatConferenceIsoDate } from "@/lib/conference-dates";
import { sectionLabel, type ConferenceSectionRow } from "@/lib/conference-sections";
import "@/lib/i18n/config";

const steps = [
  { icon: BookOpen, titleKey: "step1Title", descriptionKey: "step1Description" },
  { icon: Atom, titleKey: "step2Title", descriptionKey: "step2Description" },
  { icon: Sparkles, titleKey: "step3Title", descriptionKey: "step3Description" }
] as const;

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const { settings } = useConferenceSettings();
  /** All thematic sections from admin (current EN/UA names). Not filtered by submissions so renames never hide the block. */
  const [thematicSections, setThematicSections] = useState<ConferenceSectionRow[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/conference-sections", { cache: "no-store" });
        const json = (await res.json()) as { sections?: ConferenceSectionRow[] };
        setThematicSections(json.sections ?? []);
      } catch {
        setThematicSections([]);
      }
    };
    void load();
  }, []);
  const loc = i18n.language === "ua" ? "ua" : "en";
  const heroDateLabel = formatConferenceIsoDate(settings.date, loc) || t("heroDate");
  const deadlineLabel = settings.deadline ? formatConferenceIsoDate(settings.deadline, loc) : "";
  const registrationBannerText = deadlineLabel ? t("registrationUntil", { date: deadlineLabel }) : t("registrationBanner");
  const heroTitleText = settings.title?.trim() || t("heroTitle");
  const locationText = settings.location?.trim() || t("heroFormat");
  const aboutDescription = settings.description?.trim() || t("conferenceGoal");
  const step3Text = t("step3JoinHint", { date: heroDateLabel, location: locationText });
  const zoomLinkRaw = settings.zoom_link?.trim() ?? "";
  const zoomDetailsText = settings.zoom_details?.trim() ?? "";
  const zoomHref = (raw: string) => {
    const s = raw.trim();
    if (!s) {
      return "#";
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(s)) {
      return s;
    }
    return `https://${s}`;
  };

  return (
    <main className="min-h-screen">
      <section className="animated-academic-gradient relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.25),_transparent_45%)]" />

        <div className="container relative z-10 py-6 md:py-8">
          <div className="mb-5 rounded-md border border-[#F0A500]/70 bg-[#F0A500]/15 px-4 py-2 text-center text-sm font-semibold text-[#F0A500]">
            {registrationBannerText}
          </div>

          <header className="flex items-center justify-between gap-4">
            <SiteTextLogo />
            <LanguageSwitcher />
          </header>

          <div className="mx-auto max-w-4xl py-20 text-center md:py-28">
            <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-4xl">{heroTitleText}</h1>
            <p className="mx-auto mt-5 flex items-center justify-center gap-2 text-base text-white/90 sm:text-xl">
              <CalendarDays className="h-5 w-5" /> {heroDateLabel}
            </p>
            <p className="mx-auto mt-3 flex items-center justify-center gap-2 text-base text-white/90 sm:text-xl">
              <Video className="h-5 w-5" /> {locationText}
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="min-w-44"><Link href="/register">{t("navRegister")}</Link></Button><Button asChild size="lg" variant="outline" className="min-w-44 border-white text-white hover:bg-white/10"><Link href="/login">{t("navLogin")}</Link></Button>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-14 md:py-20">
        <h2 className="mb-3 text-center text-3xl font-bold md:mb-4">{t("aboutConference")}</h2>
        <p className="mx-auto max-w-4xl text-center text-slate-300">{aboutDescription}</p>
        <p className="mx-auto mt-3 max-w-4xl text-center text-slate-300">{t("conferenceOrganizer")}</p>
      </section>

      <section className="container pb-14 md:pb-20">
        <h2 className="mb-2 text-center text-3xl font-bold">{t("conferenceLanguagesTitle")}</h2>
        <p className="text-center text-slate-300">{t("conferenceLanguagesSubtitle")}</p>
        <p className="mt-2 text-center text-base font-medium text-[#F0A500]">{t("conferenceLanguagesList")}</p>
      </section>

      {thematicSections.length > 0 && (
        <section className="container pb-14 md:pb-20">
          <h2 className="mb-8 text-center text-3xl font-bold md:mb-10">{t("thematicPanelsTitle")}</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {thematicSections.map((sec) => (
              <Card key={sec.id} className="border-white/10 bg-white/5">
                <CardHeader>
                  <CardTitle>{sectionLabel(sec, i18n.language)}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="container pb-14 md:pb-20">
        <h2 className="mb-8 text-center text-3xl font-bold md:mb-10">{t("howToParticipate")}</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map(({ icon: Icon, titleKey, descriptionKey }, index) => (
            <Card key={titleKey} className="border-white/10 bg-white/5">
              <CardHeader>
                <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <CardTitle>{`${index + 1}. ${t(titleKey)}`}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-6 text-slate-300">
                  {titleKey === "step3Title" ? step3Text : t(descriptionKey)}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="container pb-14 md:pb-20">
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>{t("zoomTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-slate-400">{t("zoomLink")}</p>
              {zoomLinkRaw ? (
                <a
                  href={zoomHref(zoomLinkRaw)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-lg font-semibold text-primary underline-offset-4 hover:underline break-all"
                >
                  {t("zoomOpenLink")}
                </a>
              ) : (
                <p className="mt-1 text-lg font-semibold text-slate-500">—</p>
              )}
            </div>
            <div>
              <p className="text-sm text-slate-400">{t("zoomDetails")}</p>
              <p className={`mt-1 text-lg font-semibold text-white ${zoomDetailsText ? "whitespace-pre-wrap" : ""}`}>
                {zoomDetailsText || "—"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-400">{t("zoomDate")}</p>
              <p className="text-lg font-semibold text-white">{heroDateLabel}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <footer className="border-t border-white/10 bg-black/30 py-8">
        <div className="container flex flex-col items-center justify-between gap-3 text-sm text-slate-300 sm:flex-row">
          <p>{t("footer")}</p>
          <p>{new Date().getFullYear()} Conference Platform</p>
        </div>
      </footer>
    </main>
  );
}

