"use client";

import { Atom, BookOpen, Sparkles, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";

import { ConferenceHeroEdtech } from "@/components/conference-hero-edtech";
import { useConferenceSettings } from "@/components/conference-settings-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatConferenceIsoDate, formatConferenceStartsDateTime } from "@/lib/conference-dates";
import { sectionLabel, type ConferenceSectionRow } from "@/lib/conference-sections";
import { zoomHref } from "@/lib/zoom-href";
import "@/lib/i18n/config";

const steps = [
  { icon: BookOpen, titleKey: "step1Title", descriptionKey: "step1Description" },
  { icon: Atom, titleKey: "step2Title", descriptionKey: "step2Description" },
  { icon: Sparkles, titleKey: "step3Title", descriptionKey: "step3Description" }
] as const;

/** Plenary card — solid navy CTA width helpers. */
const plenarySessionBtnClass = "w-full gap-2 sm:w-auto sm:min-w-[12rem]";

/** Thematic track / session cards — white card with navy typography. */
const trackSessionCardClass =
  "flex w-full flex-col gap-2 rounded-2xl border border-[rgba(15,35,71,0.1)] bg-white px-6 py-4 text-left no-underline shadow-none transition-all duration-200 ease-in-out hover:scale-[1.02] hover:border-[#0f2347] hover:shadow-[0_4px_20px_rgba(15,35,71,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f2347]/30";

const trackSessionCardDisabledClass =
  `${trackSessionCardClass} cursor-not-allowed opacity-60 hover:scale-100 hover:border-[rgba(15,35,71,0.1)] hover:shadow-none`;

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
  const locationText = settings.location?.trim() || t("heroFormat");
  const aboutDescription =
    loc === "ua"
      ? settings.description_ua?.trim() || t("conferenceGoal")
      : settings.description?.trim() || t("conferenceGoal");
  const step3Text = t("step3JoinHint", { date: heroDateLabel, location: locationText });
  const zoomLinkRaw = settings.zoom_link?.trim() ?? "";
  const showLiveSessionsBlock = thematicSections.length > 0 || Boolean(zoomLinkRaw);
  const plenaryStartsWhen = settings.plenary_start_time?.trim()
    ? formatConferenceStartsDateTime(settings.plenary_start_time, loc)
    : settings.date
      ? formatConferenceIsoDate(settings.date, loc)
      : "";

  return (
    <main>
      <section className="public-tech-section-alt border-b border-slate-200/80">
        <div className="container relative z-10 py-6 md:py-8">
          <div className="public-tech-card rounded-lg px-4 py-2.5 text-center text-sm font-semibold md:text-base">
            {registrationBannerText}
          </div>
        </div>
      </section>

      <ConferenceHeroEdtech />

      <div className="relative z-10 flex flex-col bg-white">
      <section
        id="about"
        className="public-tech-section-alt container scroll-mt-24 border-t border-slate-200/80 py-14 md:py-20"
      >
        <h2 className="mb-3 text-center text-3xl font-bold text-[#0F172A] md:mb-4">{t("aboutConference")}</h2>
        <p className="public-tech-muted mx-auto max-w-4xl text-center">{aboutDescription}</p>
        <p className="public-tech-muted mx-auto mt-3 max-w-4xl text-center">{t("conferenceOrganizer")}</p>
      </section>

      <section className="public-tech-section container border-t border-slate-200/80 py-14 md:py-20">
        <h2 className="mb-2 text-center text-3xl font-bold text-[#0F172A]">{t("conferenceLanguagesTitle")}</h2>
        <p className="public-tech-muted text-center">{t("conferenceLanguagesSubtitle")}</p>
        <p className="mt-2 text-center text-base font-semibold text-[#4F46E5]">{t("conferenceLanguagesList")}</p>
      </section>

      <section className="public-tech-section-alt container border-t border-slate-200/80 pb-14 md:pb-20">
        <h2 className="mb-8 text-center text-3xl font-bold text-[#0F172A] md:mb-10">{t("howToParticipate")}</h2>
        <div className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:gap-6 md:overflow-visible md:px-0 md:pb-0 md:snap-none">
          {steps.map(({ icon: Icon, titleKey, descriptionKey }, index) => (
            <Card
              key={titleKey}
              className="w-[80vw] max-w-[80vw] shrink-0 snap-start rounded-xl border border-[rgba(108,99,255,0.2)] bg-white/80 text-[#0F172A] shadow-[0_4px_24px_rgba(79,70,229,0.08)] backdrop-blur-md supports-[backdrop-filter]:bg-[#F8FAFC]/75 md:w-auto md:max-w-none md:shrink md:snap-align-none"
            >
              <CardHeader>
                <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#6C63FF]/12 text-[#6C63FF]">
                  <Icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl font-semibold text-[#0F172A]">{`${index + 1}. ${t(titleKey)}`}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-6 text-[#0F172A]">
                  {titleKey === "step3Title" ? step3Text : t(descriptionKey)}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {showLiveSessionsBlock ? (
        <section className="public-tech-section container border-t border-slate-200/80 pb-14 md:pb-20">
          <h2 className="mb-8 text-center text-3xl font-bold text-[#0F172A] md:mb-10">{t("liveSessionsTitle")}</h2>
          <div className="mx-auto flex w-full max-w-xl flex-col gap-6 md:max-w-3xl">
            <div className="flex w-full flex-col items-center">
              {zoomLinkRaw ? (
                <Button asChild variant="cta" className={plenarySessionBtnClass}>
                  <a href={zoomHref(zoomLinkRaw)} target="_blank" rel="noopener noreferrer">
                    <Video className="h-5 w-5 shrink-0" />
                    {t("plenarySessionOpening")}
                  </a>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="cta"
                  disabled
                  className={`${plenarySessionBtnClass} opacity-60 hover:scale-100`}
                  aria-disabled="true"
                >
                  <Video className="h-5 w-5 shrink-0 opacity-50" />
                  {t("plenarySessionOpening")}
                </Button>
              )}
              {plenaryStartsWhen ? (
                <p className="mt-3 text-center text-sm text-[#0F172A]">
                  <Trans
                    i18nKey="homeSectionZoomStarts"
                    values={{ dateTime: plenaryStartsWhen }}
                    components={{ accent: <span className="font-medium text-[#6C63FF]" /> }}
                  />
                </p>
              ) : null}
            </div>
            {thematicSections.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:items-stretch">
                {thematicSections.map((sec) => {
                  const zoomRaw = (sec.zoom_link ?? "").trim();
                  const hasZoom = zoomRaw.length > 0;
                  const titleText = sectionLabel(sec, i18n.language);
                  const sectionStartsWhen =
                    sec.start_time?.trim() ? formatConferenceStartsDateTime(sec.start_time, loc) : "";
                  return (
                    <div key={sec.id} className="min-w-0 self-stretch">
                      {hasZoom ? (
                        <a
                          href={zoomHref(zoomRaw)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={trackSessionCardClass}
                        >
                          <div className="flex items-start gap-3">
                            <Video className="mt-0.5 h-5 w-5 shrink-0 text-[#0f2347]" aria-hidden />
                            <span className="min-w-0 flex-1 break-words text-base font-semibold leading-snug text-[#0f2347]">
                              {titleText}
                            </span>
                          </div>
                          {sectionStartsWhen ? (
                            <p className="text-sm text-[#0f2347]">
                              <Trans
                                i18nKey="homeSectionZoomStarts"
                                values={{ dateTime: sectionStartsWhen }}
                                components={{ accent: <span className="font-medium text-[#6C63FF]" /> }}
                              />
                            </p>
                          ) : null}
                        </a>
                      ) : (
                        <div className={trackSessionCardDisabledClass} aria-disabled="true">
                          <div className="flex items-start gap-3">
                            <Video className="mt-0.5 h-5 w-5 shrink-0 text-[#0f2347] opacity-50" aria-hidden />
                            <span className="min-w-0 flex-1 break-words text-base font-semibold leading-snug text-[#0f2347]">
                              {titleText}
                            </span>
                          </div>
                          {sectionStartsWhen ? (
                            <p className="text-sm text-[#0f2347]">
                              <Trans
                                i18nKey="homeSectionZoomStarts"
                                values={{ dateTime: sectionStartsWhen }}
                                components={{ accent: <span className="font-medium text-[#6C63FF]" /> }}
                              />
                            </p>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
      </div>
    </main>
  );
}
