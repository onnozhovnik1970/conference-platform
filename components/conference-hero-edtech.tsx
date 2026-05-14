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

/** Random value in [min, max). Used only after mount (client). */
function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

type HeroEmojiSlots = {
  mic: CSSProperties;
  cam: CSSProperties;
  books: CSSProperties;
  projector: CSSProperties;
  podium: CSSProperties;
  chart: CSSProperties;
};

/**
 * Six emojis in four corners only (two stacked in each top corner, one per bottom corner) — kept away from vertical center / title block.
 */
function buildHeroEmojiSlots(): HeroEmojiSlots {
  const jitter = () => rand(-0.9, 0.9);
  const pct = (min: number, max: number) =>
    Math.min(max + 1.1, Math.max(min - 0.25, rand(min, max) + jitter()));

  return {
    mic: { top: `${pct(2, 5.5)}%`, left: `${pct(2, 5.5)}%` },
    podium: { top: `${pct(11, 15.5)}%`, left: `${pct(2.5, 6.5)}%` },
    cam: { top: `${pct(2, 5.5)}%`, right: `${pct(2, 5.5)}%` },
    chart: { top: `${pct(11, 15.5)}%`, right: `${pct(2.5, 6.5)}%` },
    books: { bottom: `${pct(3, 7)}%`, left: `${pct(2.5, 6.5)}%` },
    projector: { bottom: `${pct(3, 7)}%`, right: `${pct(2.5, 6.5)}%` }
  };
}

type FloatingEmojiProps = {
  emoji: string;
  positionStyle: CSSProperties;
  floatDuration: number;
  reducedMotion: boolean | null;
  sizeClass: string;
};

/** Bare emoji — decorative layer only; keep z-index below copy (see parent wrapper). */
function FloatingEmoji({ emoji, positionStyle, floatDuration, reducedMotion, sizeClass }: FloatingEmojiProps) {
  return (
    <div className="pointer-events-none absolute z-0" style={positionStyle} aria-hidden>
      <motion.div
        animate={reducedMotion ? undefined : { y: [0, -8, 0] }}
        transition={
          reducedMotion ? undefined : { duration: floatDuration, repeat: Infinity, ease: "easeInOut" as const }
        }
        className={`select-none bg-transparent leading-none ${sizeClass}`}
        role="presentation"
      >
        <span aria-hidden>{emoji}</span>
      </motion.div>
    </div>
  );
}

/**
 * Full-width hero: `hero_image_url` as cover, `bg-black/50` overlay, title + CTAs only (no body copy — that lives in About Conference).
 * Dark blue gradient fallback when URL is missing or the image fails. Six floating emojis in corner bands only (below copy).
 */
export function ConferenceHeroEdtech() {
  const { t, i18n } = useTranslation();
  const { settings } = useConferenceSettings();
  const reducedMotion = useReducedMotion();
  const loc = i18n.language === "ua" ? "ua" : "en";

  const heroUrlRaw = settings.hero_image_url?.trim() ?? "";
  const heroImageSrc = useMemo(() => normalizeHeroImageUrl(heroUrlRaw), [heroUrlRaw]);
  const [bgFailed, setBgFailed] = useState(false);
  const [emojiSlots, setEmojiSlots] = useState<HeroEmojiSlots | null>(null);

  useEffect(() => {
    setEmojiSlots(buildHeroEmojiSlots());
  }, []);

  useEffect(() => {
    setBgFailed(false);
  }, [heroUrlRaw]);

  const showPhotoBg = Boolean(heroImageSrc) && !bgFailed;

  /** Full `title` / `title_ua` from settings — never split into “headline vs subtitle” (DB often uses multiple lines for one official title). */
  const conferenceTitle = useMemo(() => {
    const ua = settings.title_ua?.trim();
    const en = settings.title?.trim();
    if (loc === "ua") {
      return ua || en || t("heroTitle");
    }
    return en || ua || t("heroTitle");
  }, [loc, settings.title, settings.title_ua, t]);

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

  const emojiSizeClass = "text-[40px] sm:text-4xl md:text-5xl";

  return (
    <section
      className={`relative isolate box-border flex min-h-[min(85svh,880px)] w-full max-w-full flex-col justify-center overflow-hidden ${interHero.className}`}
    >
      {/* Fallback when no image — solid dark blue gradient (visible on all viewports) */}
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-br from-[#0f2347] to-[#1a3a6b]"
        aria-hidden
      />

      {showPhotoBg && heroImageSrc ? (
        <>
          <div className="pointer-events-none absolute inset-0 z-[1] size-full">
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
          <div className="pointer-events-none absolute inset-0 z-[2] bg-black/50" aria-hidden />
        </>
      ) : null}

      {emojiSlots ? (
        <div
          className="pointer-events-none absolute inset-0 z-[3] overflow-hidden"
          aria-hidden
        >
          <FloatingEmoji
            emoji="🎤"
            positionStyle={emojiSlots.mic}
            floatDuration={3.5}
            reducedMotion={reducedMotion}
            sizeClass={emojiSizeClass}
          />
          <FloatingEmoji
            emoji="📷"
            positionStyle={emojiSlots.cam}
            floatDuration={4}
            reducedMotion={reducedMotion}
            sizeClass={emojiSizeClass}
          />
          <FloatingEmoji
            emoji="📚"
            positionStyle={emojiSlots.books}
            floatDuration={3.2}
            reducedMotion={reducedMotion}
            sizeClass={emojiSizeClass}
          />
          <FloatingEmoji
            emoji="📽️"
            positionStyle={emojiSlots.projector}
            floatDuration={3.6}
            reducedMotion={reducedMotion}
            sizeClass={emojiSizeClass}
          />
          <FloatingEmoji
            emoji="🎙️"
            positionStyle={emojiSlots.podium}
            floatDuration={3.45}
            reducedMotion={reducedMotion}
            sizeClass={emojiSizeClass}
          />
          <FloatingEmoji
            emoji="📊"
            positionStyle={emojiSlots.chart}
            floatDuration={3.75}
            reducedMotion={reducedMotion}
            sizeClass={emojiSizeClass}
          />
        </div>
      ) : null}

      <div className="relative z-20 mx-auto box-border flex w-full max-w-full flex-1 flex-col justify-center px-4 py-14 sm:px-6 sm:py-16 md:py-20">
        <motion.div
          initial={fadeUp.initial}
          whileInView={fadeUp.animate}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ ...fadeUp.transition, delay: 0.04 }}
          className="relative z-10 mx-auto flex w-full max-w-full flex-col items-center text-center"
        >
          <div className="mb-6 flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm sm:gap-x-3 sm:px-4 sm:text-sm">
            <span className="inline-flex max-w-full items-center gap-1.5 break-words">
              <Calendar className="h-3.5 w-3.5 shrink-0 opacity-95 sm:h-4 sm:w-4" aria-hidden />
              {dateLabel}
            </span>
            <span className="text-white/45" aria-hidden>
              ·
            </span>
            {badgeCityLine ? (
              <>
                <span className="inline-flex max-w-full items-center gap-1.5 break-words">
                  <MapPin className="h-3.5 w-3.5 shrink-0 opacity-90 sm:h-4 sm:w-4" aria-hidden />
                  {badgeCityLine}
                </span>
                <span className="text-white/45" aria-hidden>
                  ·
                </span>
              </>
            ) : null}
            <span className="inline-flex max-w-full items-center gap-1.5 break-words">
              <Video className="h-3.5 w-3.5 shrink-0 opacity-90 sm:h-4 sm:w-4" aria-hidden />
              {t("heroFormat")}
            </span>
          </div>

          <h1 className="mx-auto w-full max-w-[min(100%,54rem)] text-balance whitespace-pre-line text-3xl font-bold leading-[1.12] tracking-tight text-white sm:text-4xl md:text-[1.7rem] md:leading-[1.14] lg:text-[1.82rem] xl:text-[1.95rem] 2xl:text-[2rem]">
            {conferenceTitle}
          </h1>

          <div className="mt-10 flex w-full max-w-full flex-col gap-3 sm:flex sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center">
            <Button
              asChild
              size="lg"
              className="h-12 w-full max-w-xs border-0 bg-white text-base font-semibold text-slate-900 shadow-md shadow-black/25 sm:h-14 sm:max-w-none sm:min-w-[12rem] sm:w-auto"
            >
              <Link href="/register">{t("heroRegisterNow")}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 w-full max-w-xs border-2 border-white bg-transparent text-base font-semibold text-white shadow-md shadow-black/20 hover:bg-white/10 sm:h-14 sm:max-w-none sm:min-w-[12rem] sm:w-auto"
            >
              <Link href="/login">{t("navLogin")}</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
