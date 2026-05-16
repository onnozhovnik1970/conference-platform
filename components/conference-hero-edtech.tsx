"use client";

import { motion } from "framer-motion";
import { Calendar, MapPin, Video } from "lucide-react";
import { Inter } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useConferenceSettings } from "@/components/conference-settings-provider";
import { formatConferenceIsoDate } from "@/lib/conference-dates";
import { parseHeroBgColor, parseHeroType } from "@/lib/conference-settings";
import "@/lib/i18n/config";

const interHero = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  weight: ["400", "600", "700", "800"]
});

const ParticlesBackground = dynamic(() => import("@/components/particles-background"), {
  ssr: false
});

/** Accepts https URLs, protocol-relative `//…`, and `data:image/…` for tests. */
function normalizeHeroImageUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) {
    return null;
  }
  if (/^https?:\/\//i.test(s)) {
    return s;
  }
  if (s.startsWith("//")) {
    return `https:${s}`;
  }
  if (s.startsWith("data:image/")) {
    return s;
  }
  if (s.startsWith("/")) {
    return s;
  }
  return null;
}

/** True when `location` is only format/venue text that duplicates the Zoom badge line. */
function isZoomRedundantLocation(location: string, zoomLabel: string): boolean {
  const v = location.trim().toLowerCase();
  if (!v) {
    return false;
  }
  const z = zoomLabel.trim().toLowerCase();
  if (v === z) {
    return true;
  }
  const mentionsZoom = /\bzoom\b/.test(v) || v.includes("зум");
  const mentionsOnline = /online|онлайн|через|via/.test(v);
  return mentionsZoom && mentionsOnline;
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }
};

/**
 * Full-width hero: `hero_type` image (`hero_image_url`) or particles animation; H1/H2 + CTAs.
 */
export function ConferenceHeroEdtech() {
  const { t, i18n } = useTranslation();
  const { settings } = useConferenceSettings();
  const loc = i18n.language === "ua" ? "ua" : "en";

  const heroType = parseHeroType(settings.hero_type);
  const isParticlesHero = heroType === "particles";
  const heroBgColor = parseHeroBgColor(settings.hero_bg_color);
  const heroUrlRaw = settings.hero_image_url?.trim() ?? "";
  const heroImageSrc = useMemo(() => normalizeHeroImageUrl(heroUrlRaw), [heroUrlRaw]);
  const [bgFailed, setBgFailed] = useState(false);

  useEffect(() => {
    setBgFailed(false);
  }, [heroUrlRaw]);

  const showPhotoBg = !isParticlesHero && Boolean(heroImageSrc) && !bgFailed;
  const onPhotoBanner = showPhotoBg;
  const headingClass = onPhotoBanner ? "text-[#0f2347]" : "text-white";
  const badgeClass = onPhotoBanner
    ? "border-[#0f2347]/15 bg-white/80 text-[#0f2347]"
    : "border-white/25 bg-white/15 text-white";

  /** Hero H1: `title` / `title_ua` (main conference name). */
  const heroH1 = useMemo(() => {
    const ua = settings.title_ua?.trim();
    const en = settings.title?.trim();
    if (loc === "ua") {
      return ua || en || t("heroTitle");
    }
    return en || ua || t("heroTitle");
  }, [loc, settings.title, settings.title_ua, t]);

  /** Hero H2: `hero_subtitle` / `hero_subtitle_ua`; hidden when both empty. */
  const heroH2 = useMemo(() => {
    const ua = settings.hero_subtitle_ua?.trim();
    const en = settings.hero_subtitle?.trim();
    if (loc === "ua") {
      return ua || en || "";
    }
    return en || ua || "";
  }, [loc, settings.hero_subtitle, settings.hero_subtitle_ua]);

  const dateLabel = formatConferenceIsoDate(settings.date, loc) || t("heroDate");
  const badgeCityLine = useMemo(() => {
    const zoomLabel = t("heroFormat");
    const raw = settings.location?.trim() ?? "";
    if (!raw) {
      return null;
    }
    if (isZoomRedundantLocation(raw, zoomLabel)) {
      return null;
    }
    return raw;
  }, [settings.location, loc, t]);

  const heroBtnBase =
    "inline-flex h-auto w-full items-center justify-center px-8 py-3 min-w-[160px] rounded-full text-base font-semibold transition-all duration-200 ease-in-out sm:w-auto";
  const heroRegisterBtnClass = `${heroBtnBase} border-0 bg-[#0f2347] text-white shadow-none hover:border-0 hover:bg-[#1a3a6b] hover:text-white hover:shadow-[0_0_20px_rgba(15,35,71,0.4)] hover:scale-[1.03]`;
  const heroLoginBtnClass = onPhotoBanner
    ? `${heroBtnBase} border-2 border-[#0f2347] bg-transparent text-[#0f2347] shadow-none hover:border-[#0f2347] hover:bg-[#0f2347] hover:text-white hover:scale-[1.03]`
    : `${heroBtnBase} border-2 border-white bg-transparent text-white shadow-none hover:bg-white hover:text-[#0f2347] hover:scale-[1.03]`;

  const heroContent = (
    <motion.div
      initial={fadeUp.initial}
      animate={fadeUp.animate}
      transition={{ ...fadeUp.transition, delay: 0.04 }}
      className="relative z-10 mx-auto flex w-full max-w-full flex-col items-center text-center"
    >
      <div
        className={`mb-6 flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-2 rounded-full border px-3 py-2 text-xs font-semibold backdrop-blur-sm sm:gap-x-3 sm:px-4 sm:text-sm ${badgeClass}`}
      >
        <span className="inline-flex max-w-full items-center gap-1.5 break-words">
          <Calendar className="h-3.5 w-3.5 shrink-0 opacity-95 sm:h-4 sm:w-4" aria-hidden />
          {dateLabel}
        </span>
        <span className={onPhotoBanner ? "text-[#0f2347]/45" : "text-white/45"} aria-hidden>
          ·
        </span>
        {badgeCityLine ? (
          <>
            <span className="inline-flex max-w-full items-center gap-1.5 break-words">
              <MapPin className="h-3.5 w-3.5 shrink-0 opacity-90 sm:h-4 sm:w-4" aria-hidden />
              {badgeCityLine}
            </span>
            <span className={onPhotoBanner ? "text-[#0f2347]/45" : "text-white/45"} aria-hidden>
              ·
            </span>
          </>
        ) : null}
        <span className="inline-flex max-w-full items-center gap-1.5 break-words">
          <Video className="h-3.5 w-3.5 shrink-0 opacity-90 sm:h-4 sm:w-4" aria-hidden />
          {t("heroFormat")}
        </span>
      </div>

      <h1
        className={`mx-auto w-full max-w-[min(100%,54rem)] text-balance whitespace-pre-line text-4xl font-bold leading-[1.1] tracking-tight md:text-6xl md:leading-[1.08] ${headingClass}`}
      >
        {heroH1}
      </h1>
      {heroH2 ? (
        <h2
          className={`mx-auto mt-5 max-w-[min(100%,54rem)] text-balance whitespace-pre-line text-xl font-normal leading-snug md:mt-6 md:text-2xl md:leading-relaxed ${headingClass}`}
        >
          {heroH2}
        </h2>
      ) : null}

      <div className="mt-10 flex w-full max-w-full flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
        <Button asChild variant="outline" className={heroRegisterBtnClass}>
          <Link href="/register">{t("heroRegisterNow")}</Link>
        </Button>
        <Button asChild variant="outline" className={heroLoginBtnClass}>
          <Link href="/login">{t("navLogin")}</Link>
        </Button>
      </div>
    </motion.div>
  );

  if (isParticlesHero) {
    return (
      <section className={`relative isolate w-full max-w-full ${interHero.className}`}>
        <div className="relative w-full min-h-[480px]" style={{ backgroundColor: heroBgColor }}>
          <ParticlesBackground bgColor={heroBgColor} />
          <div className="relative z-10 px-4 py-10 text-center sm:px-6 sm:py-12 md:py-14">
            {heroContent}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`relative isolate box-border flex min-h-[max(400px,min(85svh,880px))] w-full max-w-full flex-col justify-center overflow-hidden ${interHero.className}`}
    >
      <div
        className={
          showPhotoBg
            ? "pointer-events-none absolute inset-0 z-0 min-h-[400px] bg-[#3aacaa]"
            : "pointer-events-none absolute inset-0 z-0 min-h-[400px] bg-gradient-to-br from-[#0f2347] via-[#1a3a6b] to-[#243b6b]"
        }
        aria-hidden
      />

      {showPhotoBg && heroImageSrc ? (
        <div className="pointer-events-none absolute inset-0 z-[1] min-h-[400px] bg-[#3aacaa]">
          <div className="relative h-full min-h-[400px] w-full">
            <Image
              src={heroImageSrc}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
              unoptimized
              onError={() => setBgFailed(true)}
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-0 z-[2] min-h-[400px] bg-white/10" aria-hidden />

      <div className="relative z-20 mx-auto box-border flex w-full max-w-full flex-1 flex-col justify-center px-4 py-14 sm:px-6 sm:py-16 md:py-20">
        {heroContent}
      </div>
    </section>
  );
}
