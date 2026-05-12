"use client";

import { Atom, BookOpen, CalendarDays, Sparkles, Video } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "@/components/language-switcher";
import { useConferenceSettings } from "@/components/conference-settings-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatConferenceIsoDate } from "@/lib/conference-dates";
import "@/lib/i18n/config";

const steps = [
  { icon: BookOpen, titleKey: "step1Title", descriptionKey: "step1Description" },
  { icon: Atom, titleKey: "step2Title", descriptionKey: "step2Description" },
  { icon: Sparkles, titleKey: "step3Title", descriptionKey: "step3Description" }
] as const;

const panels = ["panel1", "panel2", "panel3", "panel4", "panel5", "panel6"] as const;

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const { settings } = useConferenceSettings();
  const loc = i18n.language === "ua" ? "ua" : "en";
  const heroDateLabel = formatConferenceIsoDate(settings.date, loc) || t("heroDate");
  const deadlineLabel = settings.deadline ? formatConferenceIsoDate(settings.deadline, loc) : "";
  const registrationBannerText = deadlineLabel ? t("registrationUntil", { date: deadlineLabel }) : t("registrationBanner");
  const heroTitleText = settings.title?.trim() || t("heroTitle");
  const locationText = settings.location?.trim() || t("heroFormat");
  const aboutDescription = settings.description?.trim() || t("conferenceGoal");
  const step3Text = t("step3JoinHint", { date: heroDateLabel, location: locationText });

  return (
    <main className="min-h-screen">
      <section className="animated-academic-gradient relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.25),_transparent_45%)]" />

        <div className="container relative z-10 py-6 md:py-8">
          <div className="mb-5 rounded-md border border-[#F0A500]/70 bg-[#F0A500]/15 px-4 py-2 text-center text-sm font-semibold text-[#F0A500]">
            {registrationBannerText}
          </div>

          <header className="flex items-center justify-between gap-4">
            <Link href="/" className="inline-flex items-center">
              <Image src="/knteu_logo_200.png" alt="SUTE logo" width={160} height={50} className="h-[50px] w-auto" priority />
            </Link>
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

      <section className="container pb-14 md:pb-20">
        <h2 className="mb-8 text-center text-3xl font-bold md:mb-10">{t("thematicPanelsTitle")}</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {panels.map((panelKey) => (
            <Card key={panelKey} className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle>{t(panelKey)}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
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

      <section className="container pb-14 md:pb-20">
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>{t("zoomTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-slate-400">{t("zoomId")}</p>
              <p className="text-lg font-semibold text-white">341 095 4568</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">{t("zoomCode")}</p>
              <p className="text-lg font-semibold text-white">166231</p>
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

