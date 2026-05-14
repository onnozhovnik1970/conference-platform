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

function firstDescriptionParagraph(raw: string): string {
  const text = raw.trim();
  if (!text) {
    return "";
  }
  const firstBlock = text.split(/\n\s*\n+/)[0]?.trim() ?? text;
  return firstBlock;
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
 * Six bare emojis: corners shifted inward (closer to copy), plus upper left/right flanks — avoids center title block.
 */
function buildHeroEmojiSlots(): HeroEmojiSlots {
  const jitter = () => rand(-1.1, 1.1);
  const pct = (min: number, max: number) =>
    Math.min(max + 1.25, Math.max(min - 0.35, rand(min, max) + jitter()));

  return {
    mic: { top: `${pct(5.5, 10)}%`, left: `${pct(6, 12)}%` },
    cam: { top: `${pct(5.5, 10)}%`, right: `${pct(6, 12)}%` },
    books: { bottom: `${pct(6, 11)}%`, left: `${pct(6, 12)}%` },
    projector: { bottom: `${pct(6, 11)}%`, right: `${pct(6, 12)}%` },
    podium: { top: `${pct(22, 30)}%`, left: `${pct(9, 17)}%` },
    chart: { top: `${pct(22, 30)}%`, right: `${pct(9, 17)}%` }
  };
}

type FloatingEmojiProps = {
  emoji: string;
  positionStyle: CSSProperties;
  floatDuration: number;
  reducedMotion: boolean | null;
  sizeClass: string;
};

/** Bare emoji in a corner — no card or background. */
function FloatingEmoji({ emoji, positionStyle, floatDuration, reducedMotion, sizeClass }: FloatingEmojiProps) {
  return (
    <div className="pointer-events-none absolute z-[3]" style={positionStyle} aria-hidden>
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
 * Full-width hero: `hero_image_url` as cover (`next/image` fill + object-cover), `bg-black/50` overlay, centered copy + single CTA.
 * Dark blue gradient fallback when URL is missing or the image fails. Six floating emojis (corners + upper flanks).
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

  const subtitleText = useMemo(() => {
    const ua = settings.description_ua?.trim();
    const en = settings.description?.trim();
    const body = loc === "ua" ? ua || en : en || ua;
    if (!body) {
      return t("heroDeckSubtitle");
    }
    const first = firstDescriptionParagraph(body);
    return first.length > 0 ? first : t("heroDeckSubtitle");
  }, [loc, settings.description, settings.description_ua, t]);

  const dateLabel = formatConferenceIsoDate(settings.date, loc) || t("heroDate");
  const locationText = settings.location?.trim() || t("heroFormat");

  const emojiSizeClass = "text-[40px] sm:text-4xl md:text-5xl";

  return (
    <section
      className={`relative box-border flex min-h-[min(85svh,880px)] w-full max-w-full flex-col justify-center overflow-hidden ${interHero.className}`}
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
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
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

      <div className="relative z-10 mx-auto box-border flex w-full max-w-full flex-1 flex-col justify-center px-4 py-14 sm:px-6 sm:py-16 md:py-20">
        <motion.div
          initial={fadeUp.initial}
          whileInView={fadeUp.animate}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ ...fadeUp.transition, delay: 0.04 }}
          className="mx-auto flex w-full max-w-full flex-col items-center text-center"
        >
          <div className="mb-6 flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm sm:gap-x-3 sm:px-4 sm:text-sm">
            <span className="inline-flex max-w-full items-center gap-1.5 break-words">
              <Calendar className="h-3.5 w-3.5 shrink-0 opacity-95 sm:h-4 sm:w-4" aria-hidden />
              {dateLabel}
            </span>
            <span className="text-white/45" aria-hidden>
              ·
            </span>
            <span className="inline-flex max-w-full items-center gap-1.5 break-words">
              <MapPin className="h-3.5 w-3.5 shrink-0 opacity-90 sm:h-4 sm:w-4" aria-hidden />
              {locationText}
            </span>
            <span className="text-white/45" aria-hidden>
              ·
            </span>
            <span className="inline-flex max-w-full items-center gap-1.5 break-words">
              <Video className="h-3.5 w-3.5 shrink-0 opacity-90 sm:h-4 sm:w-4" aria-hidden />
              {t("heroFormat")}
            </span>
          </div>

          <h1 className="max-w-full whitespace-pre-line text-balance text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
            {conferenceTitle}
          </h1>

          {subtitleText ? (
            <p className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-white/80 sm:text-lg md:text-xl">
              {subtitleText}
            </p>
          ) : null}

          <div className="mt-10 w-full max-w-full sm:flex sm:justify-center">
            <Button
              asChild
              size="lg"
              className="h-12 w-full max-w-xs border-0 bg-white text-base font-semibold text-slate-900 shadow-md shadow-black/25 sm:h-14 sm:max-w-none sm:min-w-[12rem] sm:w-auto"
            >
              <Link href="/register">{t("heroRegisterNow")}</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
