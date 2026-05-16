"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Calendar, MapPin, Video } from "lucide-react";
import { Inter } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useConferenceSettings } from "@/components/conference-settings-provider";
import { formatConferenceIsoDate } from "@/lib/conference-dates";
import "@/lib/i18n/config";

const interHero = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  weight: ["400", "600", "700", "800"]
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

const HERO_FLOAT_EMOJIS = ["🎤", "📖", "🌍", "🎓", "⚡"] as const;

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }
};

/** Random value in [min, max). Used only after mount (client). */
function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

type HeroEmojiSlot = CSSProperties;

/** Five corner-band positions (randomized after mount) — away from vertical center / title block. */
function buildHeroEmojiSlots(): HeroEmojiSlot[] {
  const jitter = () => rand(-0.9, 0.9);
  const pct = (min: number, max: number) =>
    Math.min(max + 1.1, Math.max(min - 0.25, rand(min, max) + jitter()));

  return [
    { top: `${pct(2, 5.5)}%`, left: `${pct(2, 5.5)}%` },
    { top: `${pct(2, 5.5)}%`, right: `${pct(2, 5.5)}%` },
    { top: `${pct(11, 16)}%`, left: `${pct(2.5, 7)}%` },
    { top: `${pct(11, 16)}%`, right: `${pct(2.5, 7)}%` },
    { bottom: `${pct(3, 7)}%`, left: `${pct(38, 52)}%` }
  ];
}

type FloatingNeonEmojiProps = {
  emoji: string;
  positionStyle: HeroEmojiSlot;
  floatDuration: number;
  reducedMotion: boolean | null;
  /** Alternates cyan vs pink glow */
  glowIndex: number;
};

/** Bare emoji (48px) with neon drop-shadow — no extra box or background. */
function FloatingNeonEmoji({ emoji, positionStyle, floatDuration, reducedMotion, glowIndex }: FloatingNeonEmojiProps) {
  const filter =
    glowIndex % 2 === 0
      ? "drop-shadow(0 0 12px rgba(0, 240, 255, 0.6))"
      : "drop-shadow(0 0 12px rgba(255, 42, 122, 0.6))";

  return (
    <motion.span
      className="pointer-events-none absolute z-[3] select-none leading-none"
      style={{ ...positionStyle, fontSize: 48, filter }}
      aria-hidden
      role="presentation"
      animate={reducedMotion ? undefined : { y: [0, -8, 0] }}
      transition={
        reducedMotion ? undefined : { duration: floatDuration, repeat: Infinity, ease: "easeInOut" as const }
      }
    >
      {emoji}
    </motion.span>
  );
}

/**
 * Full-width hero: `hero_image_url` cover, H1/H2 + CTAs (navy typography on image).
 * Five bare neon emojis (🎤 📖 🌍 🎓 ⚡) in corner bands — no per-emoji boxes or backgrounds.
 */
export function ConferenceHeroEdtech() {
  const { t, i18n } = useTranslation();
  const { settings } = useConferenceSettings();
  const reducedMotion = useReducedMotion();
  const loc = i18n.language === "ua" ? "ua" : "en";

  const heroUrlRaw = settings.hero_image_url?.trim() ?? "";
  const heroImageSrc = useMemo(() => normalizeHeroImageUrl(heroUrlRaw), [heroUrlRaw]);
  const [bgFailed, setBgFailed] = useState(false);
  const [emojiSlots, setEmojiSlots] = useState<HeroEmojiSlot[] | null>(null);

  useEffect(() => {
    setEmojiSlots(buildHeroEmojiSlots());
  }, []);

  useEffect(() => {
    setBgFailed(false);
  }, [heroUrlRaw]);

  const showPhotoBg = Boolean(heroImageSrc) && !bgFailed;
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

  const floatDurations = [3.5, 4, 3.2, 3.6, 3.45] as const;

  return (
    <section
      className={`relative isolate box-border flex min-h-[max(400px,min(85svh,880px))] w-full max-w-full flex-col justify-center overflow-hidden ${interHero.className}`}
    >
      {/* Banner base — visible navy gradient (always; image layers on top when set) */}
      <div
        className="pointer-events-none absolute inset-0 z-0 min-h-[400px] bg-gradient-to-br from-[#0f2347] via-[#1a3a6b] to-[#243b6b]"
        aria-hidden
      />

      {showPhotoBg && heroImageSrc ? (
        <div className="pointer-events-none absolute inset-0 z-[1] min-h-[400px]">
          <div className="relative h-full min-h-[400px] w-full">
            <Image
              src={heroImageSrc}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
              unoptimized
              onError={() => setBgFailed(true)}
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      ) : null}

      {emojiSlots
        ? HERO_FLOAT_EMOJIS.map((emoji, i) => (
            <FloatingNeonEmoji
              key={emoji}
              emoji={emoji}
              positionStyle={emojiSlots[i]!}
              floatDuration={floatDurations[i]}
              reducedMotion={reducedMotion}
              glowIndex={i}
            />
          ))
        : null}

      <div className="relative z-20 mx-auto box-border flex w-full max-w-full flex-1 flex-col justify-center px-4 py-14 sm:px-6 sm:py-16 md:py-20">
        <motion.div
          initial={fadeUp.initial}
          animate={fadeUp.animate}
          transition={{ ...fadeUp.transition, delay: 0.04 }}
          className="relative z-10 mx-auto flex w-full max-w-full flex-col items-center text-center"
        >
          <div className={`mb-6 flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-2 rounded-full border px-3 py-2 text-xs font-semibold backdrop-blur-sm sm:gap-x-3 sm:px-4 sm:text-sm ${badgeClass}`}>
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

          <h1 className={`mx-auto w-full max-w-[min(100%,54rem)] text-balance whitespace-pre-line text-4xl font-bold leading-[1.1] tracking-tight md:text-6xl md:leading-[1.08] ${headingClass}`}>
            {heroH1}
          </h1>
          {heroH2 ? (
            <h2 className={`mx-auto mt-5 max-w-[min(100%,54rem)] text-balance whitespace-pre-line text-xl font-normal leading-snug md:mt-6 md:text-2xl md:leading-relaxed ${headingClass}`}>
              {heroH2}
            </h2>
          ) : null}

          <div className="mt-10 flex w-full max-w-full flex-col gap-3 sm:flex sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center">
            <Button asChild variant="cta" className="w-full max-w-xs sm:w-auto sm:min-w-[12rem]">
              <Link href="/register">{t("heroRegisterNow")}</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className={
                onPhotoBanner
                  ? "h-auto w-full max-w-xs rounded-full border-2 border-[#0f2347] bg-transparent px-8 py-3 text-base font-semibold text-[#0f2347] shadow-none transition-all duration-200 ease-in-out hover:scale-[1.03] hover:border-[#0f2347] hover:bg-[#0f2347] hover:text-white sm:w-auto sm:min-w-[12rem]"
                  : "h-auto w-full max-w-xs rounded-full border-2 border-white bg-transparent px-8 py-3 text-base font-semibold text-white shadow-none transition-all duration-200 ease-in-out hover:scale-[1.03] hover:bg-white hover:text-[#0f2347] sm:w-auto sm:min-w-[12rem]"
              }
            >
              <Link href="/login">{t("navLogin")}</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
