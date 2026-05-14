"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Calendar, MapPin, Video } from "lucide-react";
import { Inter } from "next/font/google";
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

function splitTitleLines(raw: string): { headline: string; subtitle: string | null } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { headline: "", subtitle: null };
  }
  const lines = trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length <= 1) {
    return { headline: lines[0] ?? trimmed, subtitle: null };
  }
  return { headline: lines[0], subtitle: lines.slice(1).join(" ") };
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

type CornerEmojiSlots = {
  mic: CSSProperties;
  cam: CSSProperties;
  books: CSSProperties;
  star: CSSProperties;
};

/** Four corners of the hero — small jitter on each load, clamped inside safe bands. */
function buildCornerEmojiSlots(): CornerEmojiSlots {
  const jitter = () => rand(-1.1, 1.1);
  const pct = (min: number, max: number) =>
    Math.min(max + 1.25, Math.max(min - 0.35, rand(min, max) + jitter()));

  return {
    mic: { top: `${pct(1.25, 4)}%`, left: `${pct(1.25, 4)}%` },
    cam: { top: `${pct(1.25, 4)}%`, right: `${pct(1.25, 4)}%` },
    books: { bottom: `${pct(1.25, 4)}%`, left: `${pct(1.25, 4)}%` },
    star: { bottom: `${pct(1.25, 4)}%`, right: `${pct(1.25, 4)}%` }
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
 * Full-width hero: `hero_image_url` as cover background, `bg-black/50` overlay, centered copy + single CTA.
 * Gradient fallback when URL is missing or the image fails. Corner floating emojis only.
 */
export function ConferenceHeroEdtech() {
  const { t, i18n } = useTranslation();
  const { settings, loading } = useConferenceSettings();
  const reducedMotion = useReducedMotion();
  const loc = i18n.language === "ua" ? "ua" : "en";

  const heroUrlRaw = settings.hero_image_url?.trim() ?? "";
  const isHttpImage = /^https?:\/\//i.test(heroUrlRaw);
  const [bgFailed, setBgFailed] = useState(false);
  const [emojiSlots, setEmojiSlots] = useState<CornerEmojiSlots | null>(null);

  useEffect(() => {
    setEmojiSlots(buildCornerEmojiSlots());
  }, []);

  useEffect(() => {
    setBgFailed(false);
  }, [heroUrlRaw]);

  const showPhotoBg = !loading && isHttpImage && !bgFailed;

  const titleSource = useMemo(() => {
    const ua = settings.title_ua?.trim();
    const en = settings.title?.trim();
    if (loc === "ua") {
      return ua || en || t("heroTitle");
    }
    return en || ua || t("heroTitle");
  }, [loc, settings.title, settings.title_ua, t]);

  const { headline, subtitle } = useMemo(() => splitTitleLines(titleSource), [titleSource]);
  const subtitleText = subtitle != null && subtitle.trim().length > 0 ? subtitle : t("heroDeckSubtitle");

  const dateLabel = formatConferenceIsoDate(settings.date, loc) || t("heroDate");
  const locationText = settings.location?.trim() || t("heroFormat");

  const emojiSizeClass = "text-[40px] sm:text-4xl md:text-5xl";

  return (
    <section
      className={`relative box-border flex min-h-[min(85svh,880px)] w-full max-w-full flex-col justify-center overflow-hidden ${interHero.className}`}
    >
      {/* Fallback fill — no negative offsets (mobile-safe) */}
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950"
        aria-hidden
      />

      {showPhotoBg ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary HTTPS URLs from admin */}
          <img
            src={heroUrlRaw}
            alt=""
            width={1920}
            height={600}
            loading="eager"
            decoding="async"
            sizes="100vw"
            fetchPriority="high"
            className="absolute inset-0 z-[1] h-full w-full max-w-none object-cover"
            onError={() => setBgFailed(true)}
            referrerPolicy="no-referrer"
          />
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
            emoji="⭐"
            positionStyle={emojiSlots.star}
            floatDuration={3.8}
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

          <h1 className="max-w-full text-balance text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
            {headline}
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
