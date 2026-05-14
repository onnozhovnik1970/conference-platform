"use client";

import { Atom, BookOpen, Sparkles, Video } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

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
    <main className="min-h-screen">
      <section className="animated-academic-gradient relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.25),_transparent_45%)]" />

        <div className="container relative z-10 py-6 md:py-8">
          <div className="rounded-md border border-[#F0A500]/70 bg-[#F0A500]/15 px-4 py-2 text-center text-sm font-semibold text-[#F0A500]">
            {registrationBannerText}
          </div>
        </div>
      </section>

      <ConferenceHeroEdtech />

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

      {showLiveSessionsBlock && (
        <section className="container pb-14 md:pb-20">
          <h2 className="mb-8 text-center text-3xl font-bold md:mb-10">{t("liveSessionsTitle")}</h2>
          <div className="mx-auto flex w-full max-w-xl flex-col gap-6 md:max-w-3xl">
            <div className="w-full">
              {zoomLinkRaw ? (
                <Button asChild size="lg" className="h-14 w-full gap-2 text-base font-semibold shadow-lg shadow-primary/20 md:h-16 md:text-lg">
                  <a href={zoomHref(zoomLinkRaw)} target="_blank" rel="noopener noreferrer">
                    <Video className="h-6 w-6 shrink-0" />
                    {t("plenarySessionOpening")}
                  </a>
                </Button>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  disabled
                  className="h-14 w-full gap-2 text-base opacity-60 md:h-16 md:text-lg"
                  aria-disabled="true"
                >
                  <Video className="h-6 w-6 shrink-0 opacity-50" />
                  {t("plenarySessionOpening")}
                </Button>
              )}
              {plenaryStartsWhen ? (
                <p className="mt-3 text-center text-sm text-slate-400">{t("homeSectionZoomStarts", { dateTime: plenaryStartsWhen })}</p>
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
                  const sectionBtnClass =
                    "flex h-full min-h-[80px] w-full min-w-0 max-w-full flex-1 items-center justify-center gap-2 whitespace-normal border-white/25 bg-white/5 px-4 py-3 text-center text-base leading-snug text-white md:text-lg [&_svg]:shrink-0";
                  return (
                    <div key={sec.id} className="flex min-h-[80px] min-w-0 flex-col gap-2 self-stretch">
                      <div className="flex min-h-[80px] w-full flex-1">
                      {hasZoom ? (
                        <Button
                          asChild
                          variant="outline"
                          className={`${sectionBtnClass} border-[#F0A500]/50 bg-[#F0A500]/10 text-white hover:bg-[#F0A500]/18`}
                        >
                          <a
                            href={zoomHref(zoomRaw)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-full min-h-[80px] w-full items-center justify-center gap-2 text-center"
                          >
                            <Video className="h-5 w-5 shrink-0 text-[#F0A500]" />
                            <span className="min-w-0 break-words">{titleText}</span>
                          </a>
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          disabled
                          className={`${sectionBtnClass} cursor-not-allowed border-white/10 bg-white/[0.03] text-slate-500 opacity-70 hover:bg-white/[0.03]`}
                          aria-disabled="true"
                        >
                          <Video className="h-5 w-5 shrink-0 opacity-50" />
                          <span className="min-w-0 break-words">{titleText}</span>
                        </Button>
                      )}
                      </div>
                      {sectionStartsWhen ? (
                        <p className="text-center text-sm text-slate-400">{t("homeSectionZoomStarts", { dateTime: sectionStartsWhen })}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </section>
      )}

    </main>
  );
}

