"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Calendar, MapPin, Video } from "lucide-react";
import { Inter } from "next/font/google";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }
};

/** Random value in [min, max) — client-only usage after mount. */
function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

type EmojiSlots = {
  mobile: { mic: CSSProperties; cam: CSSProperties };
  desktop: { mic: CSSProperties; cam: CSSProperties; books: CSSProperties; star: CSSProperties };
};

function buildEmojiSlots(): EmojiSlots {
  const jitter = () => rand(-1.25, 1.25);
  const pct = (min: number, max: number) => Math.min(max + 1.5, Math.max(min - 0.5, rand(min, max) + jitter()));

  return {
    mobile: {
      mic: { top: `${pct(2, 5)}%`, left: `${pct(0.75, 3.5)}%` },
      cam: { top: `${pct(2, 5)}%`, right: `${pct(0.75, 3.5)}%` }
    },
    desktop: {
      mic: { top: `${pct(5, 10)}%`, right: `${pct(2, 6)}%` },
      cam: { top: `${pct(14, 22)}%`, right: `${pct(3, 8)}%` },
      books: { bottom: `${pct(10, 18)}%`, right: `${pct(2, 7)}%` },
      star: { top: `${pct(50, 58)}%`, right: `${pct(4, 11)}%` }
    }
  };
}

type FloatingEmojiProps = {
  emoji: string;
  positionStyle: CSSProperties;
  floatDuration: number;
  reducedMotion: boolean | null;
  sizeClass: string;
  wrapperClassName: string;
};

/** Emoji only — no card; `positionStyle` uses % from hero edges (right-side / corners). */
function FloatingEmoji({
  emoji,
  positionStyle,
  floatDuration,
  reducedMotion,
  sizeClass,
  wrapperClassName
}: FloatingEmojiProps) {
  return (
    <div
      className={`pointer-events-none absolute z-[9] ${wrapperClassName}`}
      style={positionStyle}
      aria-hidden
    >
      <motion.div
        animate={reducedMotion ? undefined : { y: [0, -10, 0] }}
        transition={
          reducedMotion
            ? undefined
            : { duration: floatDuration, repeat: Infinity, ease: "easeInOut" as const }
        }
        className={`select-none bg-transparent leading-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)] ${sizeClass}`}
        role="presentation"
      >
        <span aria-hidden>{emoji}</span>
      </motion.div>
    </div>
  );
}

/**
 * Full-width hero: optional `hero_image_url` background, dark overlay, transparent floating emojis, copy + CTAs.
 * Falls back to soft gradient + blobs when URL is empty or fails to load.
 */
export function ConferenceHeroEdtech() {
  const { t, i18n } = useTranslation();
  const { settings, loading } = useConferenceSettings();
  const reducedMotion = useReducedMotion();
  const loc = i18n.language === "ua" ? "ua" : "en";

  const heroUrlRaw = settings.hero_image_url?.trim() ?? "";
  const isHttpImage = /^https?:\/\//i.test(heroUrlRaw);
  const [bgFailed, setBgFailed] = useState(false);
  const [heroImgLoaded, setHeroImgLoaded] = useState(false);
  const heroImgRef = useRef<HTMLImageElement | null>(null);
  const [emojiSlots, setEmojiSlots] = useState<EmojiSlots | null>(null);

  useEffect(() => {
    setEmojiSlots(buildEmojiSlots());
  }, []);

  useEffect(() => {
    setBgFailed(false);
    setHeroImgLoaded(false);
  }, [heroUrlRaw]);

  const showPhotoBg = !loading && isHttpImage && !bgFailed;

  useEffect(() => {
    if (!showPhotoBg) {
      return;
    }
    const el = heroImgRef.current;
    if (el?.complete && el.naturalWidth > 0) {
      setHeroImgLoaded(true);
    }
  }, [showPhotoBg, heroUrlRaw]);

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

  const mobileEmojiClass = "text-[40px]";
  const desktopEmojiClass = "text-4xl lg:text-[2.75rem]";

  return (
    <section
      className={`relative isolate flex min-h-[min(88svh,920px)] w-full flex-col justify-center overflow-hidden ${interHero.className}`}
    >
      {/* Fallback: Educate-style gradient + blobs */}
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br from-[#e8f4fd] to-[#f0e8ff] transition-opacity duration-500 ${showPhotoBg ? "opacity-0" : "opacity-100"}`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute -left-24 top-0 h-64 w-64 rounded-full bg-sky-200/40 blur-3xl transition-opacity duration-500 md:h-80 md:w-80 ${showPhotoBg ? "opacity-0" : "opacity-100"}`}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute -right-20 bottom-16 h-72 w-72 rounded-full bg-violet-200/35 blur-3xl transition-opacity duration-500 md:h-96 md:w-96 ${showPhotoBg ? "opacity-0" : "opacity-100"}`}
        aria-hidden
      />

      {/* Full-bleed background photo */}
      {showPhotoBg ? (
        <>
          <div
            className={`pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-800/90 backdrop-blur-2xl transition-opacity duration-500 ease-out motion-reduce:transition-none ${heroImgLoaded ? "opacity-0" : "opacity-100"}`}
            aria-hidden
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary HTTPS URLs from admin */}
          <img
            ref={heroImgRef}
            src={heroUrlRaw}
            alt=""
            width={1920}
            height={600}
            loading="eager"
            decoding="async"
            sizes="100vw"
            fetchPriority="high"
            className={`absolute inset-0 z-[2] h-full w-full object-cover transition-opacity duration-500 ease-out motion-reduce:transition-none ${heroImgLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setHeroImgLoaded(true)}
            onError={() => {
              setHeroImgLoaded(false);
              setBgFailed(true);
            }}
            referrerPolicy="no-referrer"
          />
          <div
            className={`pointer-events-none absolute inset-0 z-[3] bg-black/40 transition-opacity duration-500 ease-out motion-reduce:transition-none ${heroImgLoaded ? "opacity-100" : "opacity-0"}`}
            aria-hidden
          />
        </>
      ) : null}

      {emojiSlots ? (
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {/* Mobile: top corners only, 40px — keeps center clear for title / CTAs */}
          <FloatingEmoji
            emoji="🎤"
            positionStyle={emojiSlots.mobile.mic}
            floatDuration={3.5}
            reducedMotion={reducedMotion}
            sizeClass={mobileEmojiClass}
            wrapperClassName="md:hidden"
          />
          <FloatingEmoji
            emoji="📷"
            positionStyle={emojiSlots.mobile.cam}
            floatDuration={4}
            reducedMotion={reducedMotion}
            sizeClass={mobileEmojiClass}
            wrapperClassName="md:hidden"
          />
          {/* md+: right side / corners only — away from left-aligned copy */}
          <FloatingEmoji
            emoji="🎤"
            positionStyle={emojiSlots.desktop.mic}
            floatDuration={3.5}
            reducedMotion={reducedMotion}
            sizeClass={desktopEmojiClass}
            wrapperClassName="hidden md:block"
          />
          <FloatingEmoji
            emoji="📷"
            positionStyle={emojiSlots.desktop.cam}
            floatDuration={4}
            reducedMotion={reducedMotion}
            sizeClass={desktopEmojiClass}
            wrapperClassName="hidden md:block"
          />
          <FloatingEmoji
            emoji="📚"
            positionStyle={emojiSlots.desktop.books}
            floatDuration={3.2}
            reducedMotion={reducedMotion}
            sizeClass={desktopEmojiClass}
            wrapperClassName="hidden md:block"
          />
          <FloatingEmoji
            emoji="⭐"
            positionStyle={emojiSlots.desktop.star}
            floatDuration={3.8}
            reducedMotion={reducedMotion}
            sizeClass={desktopEmojiClass}
            wrapperClassName="hidden md:block"
          />
        </div>
      ) : null}

      <div className="container relative z-10 flex flex-1 flex-col justify-center px-4 py-16 sm:px-6 md:py-20 lg:py-24">
        <motion.div
          initial={fadeUp.initial}
          whileInView={fadeUp.animate}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ ...fadeUp.transition, delay: 0.04 }}
          className="mx-auto flex w-full max-w-4xl flex-col items-center text-center md:mx-0 md:max-w-3xl md:items-start md:text-left"
        >
          <div className="mb-6 flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs font-bold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.75)] sm:text-sm md:justify-start">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0 opacity-95 sm:h-4 sm:w-4" aria-hidden />
              {dateLabel}
            </span>
            <span className="hidden text-white/50 sm:inline" aria-hidden>
              ·
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 opacity-90 sm:h-4 sm:w-4" aria-hidden />
              {locationText}
            </span>
            <span className="hidden text-white/50 sm:inline" aria-hidden>
              ·
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5 shrink-0 opacity-90 sm:h-4 sm:w-4" aria-hidden />
              Online (ZOOM)
            </span>
          </div>

          <h1 className="text-balance text-3xl font-extrabold leading-[1.1] tracking-tight text-white drop-shadow-sm sm:text-4xl md:text-5xl lg:text-[2.75rem] xl:text-6xl">
            {headline}
          </h1>
          {subtitleText ? (
            <p className="mt-5 max-w-3xl text-pretty text-base font-bold leading-relaxed text-white/95 sm:text-lg md:text-xl">
              {subtitleText}
            </p>
          ) : null}

          <div className="mt-10 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:justify-center md:justify-start">
            <Button
              asChild
              size="lg"
              className="min-h-12 min-w-[10rem] flex-1 border-0 bg-white text-base font-bold text-[#0f2347] shadow-lg shadow-black/20 transition-transform duration-200 hover:scale-[1.03] hover:bg-white/95 sm:min-h-14 sm:flex-initial"
            >
              <Link href="/register">{t("navRegister")}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="min-h-12 min-w-[10rem] flex-1 border-2 border-white bg-transparent text-base font-bold text-white transition-transform duration-200 hover:scale-[1.03] hover:bg-white/10 sm:min-h-14 sm:flex-initial"
            >
              <Link href="/login">{t("navLogin")}</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
