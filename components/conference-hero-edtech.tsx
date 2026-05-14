"use client";

import { motion, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "framer-motion";
import { Calendar, MapPin, User, Video } from "lucide-react";
import { Inter } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import "@/lib/i18n/config";

const interHero = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap",
  weight: ["400", "600", "700", "800"]
});

const ACCENT = "#0f2347";

const STUDENT_IMAGE = "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=600&q=80";

const glassCard =
  "rounded-2xl border border-white/70 bg-white/40 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-md md:p-8";

/** 80×80px glass shell + emoji (Educate-style floaters). */
const emojiShellClass =
  "flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/45 text-[2.125rem] leading-none shadow-lg shadow-slate-900/10 backdrop-blur-md select-none";

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const }
};

type FloatingEmojiProps = {
  emoji: string;
  label: string;
  className: string;
  floatDuration: number;
  shiftX: MotionValue<number>;
  shiftY: MotionValue<number>;
  reducedMotion: boolean | null;
};

function FloatingEmojiCard({
  emoji,
  label,
  className,
  floatDuration,
  shiftX,
  shiftY,
  reducedMotion
}: FloatingEmojiProps) {
  return (
    <motion.div className={className} style={{ x: shiftX, y: shiftY }}>
      <motion.div
        animate={reducedMotion ? undefined : { y: [0, -10, 0] }}
        transition={
          reducedMotion
            ? undefined
            : { duration: floatDuration, repeat: Infinity, ease: "easeInOut" as const }
        }
        className={emojiShellClass}
        role="img"
        aria-label={label}
      >
        <span aria-hidden>{emoji}</span>
      </motion.div>
    </motion.div>
  );
}

/**
 * Educate-inspired hero: soft blue–lavender gradient, glass copy card, full-bleed image column, emoji floaters.
 */
export function ConferenceHeroEdtech() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const [imageFailed, setImageFailed] = useState(false);

  const mouseNormX = useMotionValue(0);
  const mouseNormY = useMotionValue(0);

  const micShiftX = useTransform(mouseNormX, (x) => x * 24);
  const micShiftY = useTransform(mouseNormY, (y) => y * 18);
  const camShiftX = useTransform(mouseNormX, (x) => x * -20);
  const camShiftY = useTransform(mouseNormY, (y) => y * 16);
  const bookShiftX = useTransform(mouseNormX, (x) => x * 18);
  const bookShiftY = useTransform(mouseNormY, (y) => y * -20);
  const starShiftX = useTransform(mouseNormX, (x) => x * 14);
  const starShiftY = useTransform(mouseNormY, (y) => y * 12);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (reducedMotion === true) {
        mouseNormX.set(0);
        mouseNormY.set(0);
        return;
      }
      const el = sectionRef.current;
      if (!el) {
        return;
      }
      const rect = el.getBoundingClientRect();
      const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      mouseNormX.set(Math.max(-1, Math.min(1, nx)));
      mouseNormY.set(Math.max(-1, Math.min(1, ny)));
    },
    [mouseNormX, mouseNormY, reducedMotion]
  );

  const handleMouseLeave = useCallback(() => {
    mouseNormX.set(0);
    mouseNormY.set(0);
  }, [mouseNormX, mouseNormY]);

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden bg-gradient-to-br from-[#e8f4fd] to-[#f0e8ff] ${interHero.className}`}
    >
      {/* Soft depth blobs (toned for light blue–lavender base) */}
      <div
        className="pointer-events-none absolute -left-24 top-0 h-64 w-64 rounded-full bg-sky-200/40 blur-3xl md:h-80 md:w-80"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 bottom-20 h-72 w-72 rounded-full bg-violet-200/35 blur-3xl md:h-96 md:w-96"
        aria-hidden
      />

      <div className="container relative z-10 py-10 md:py-14 lg:py-16">
        <div className="grid items-stretch gap-10 lg:grid-cols-2 lg:gap-0 lg:overflow-hidden lg:rounded-3xl lg:shadow-xl lg:shadow-slate-900/5">
          {/* Copy — mobile: below image (order-2) */}
          <div className="order-2 flex max-w-xl flex-col justify-center px-0 pb-2 pt-0 lg:order-1 lg:max-w-none lg:px-8 lg:py-12 xl:px-12">
            <motion.div
              initial={fadeUp.initial}
              whileInView={fadeUp.animate}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ ...fadeUp.transition, delay: 0.05 }}
              className="mb-5 inline-flex flex-wrap items-center gap-2 rounded-full border border-white/80 bg-white/50 px-3 py-2 text-xs font-bold text-[#0f2347] shadow-sm backdrop-blur-md sm:gap-2.5 sm:px-4 sm:text-sm"
            >
              <span className="inline-flex items-center gap-1.5 text-[#0f2347]">
                <Calendar className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
                May 14, 2026
              </span>
              <span className="hidden font-bold text-slate-400 sm:inline" aria-hidden>
                ·
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#0f2347]">
                <MapPin className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
                Kyiv, Ukraine
              </span>
              <span className="hidden font-bold text-slate-400 sm:inline" aria-hidden>
                ·
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#0f2347]">
                <Video className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
                Online (ZOOM)
              </span>
            </motion.div>

            <motion.div
              initial={fadeUp.initial}
              whileInView={fadeUp.animate}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ ...fadeUp.transition, delay: 0.12 }}
              className={glassCard}
            >
              <h1
                className="text-balance text-3xl font-extrabold leading-[1.12] tracking-tight sm:text-4xl md:text-5xl lg:text-[2.65rem] lg:leading-[1.1] xl:text-5xl"
                style={{ color: ACCENT }}
              >
                THE SCIENCE OF THE XXI CENTURY: CHALLENGES OF CONTEMPORANEITY
              </h1>

              <p className="mt-5 text-base font-bold leading-relaxed text-slate-700 sm:text-lg">
                IX All-Ukrainian Student Scientific and Practical Conference in Foreign Languages
              </p>

              <motion.div
                initial={fadeUp.initial}
                whileInView={fadeUp.animate}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ ...fadeUp.transition, delay: 0.22 }}
                className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap"
              >
                <Button
                  asChild
                  size="lg"
                  className="min-h-12 min-w-[10rem] flex-1 border-0 text-base font-bold text-white shadow-lg shadow-[#0f2347]/25 transition-transform duration-200 hover:scale-[1.03] sm:min-h-14 sm:flex-initial"
                  style={{ backgroundColor: ACCENT }}
                >
                  <Link href="/register">{t("navRegister")}</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="min-h-12 min-w-[10rem] flex-1 border-2 border-[#0f2347] bg-white/50 text-base font-bold text-[#0f2347] backdrop-blur-sm transition-transform duration-200 hover:scale-[1.03] hover:bg-white/80 sm:min-h-14 sm:flex-initial"
                >
                  <Link href="/login">{t("navLogin")}</Link>
                </Button>
              </motion.div>
            </motion.div>
          </div>

          {/* Image column — mobile: full-bleed on top (order-1); desktop: fills right half edge-to-edge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.06 }}
            className="relative order-1 -mx-4 w-[calc(100%+2rem)] sm:-mx-6 sm:w-[calc(100%+3rem)] md:mx-0 md:w-full lg:order-2 lg:mx-0 lg:min-h-[min(78vh,640px)] lg:w-full lg:max-w-none"
          >
            <div className="relative aspect-[4/5] min-h-[280px] w-full overflow-hidden sm:min-h-[340px] lg:aspect-auto lg:absolute lg:inset-0 lg:min-h-full">
              {!imageFailed ? (
                <Image
                  src={STUDENT_IMAGE}
                  alt={t("heroImageParticipantAlt")}
                  fill
                  priority
                  unoptimized
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover object-center"
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#c9dff3] via-[#dce9fb] to-[#e8dff5] px-6"
                  role="img"
                  aria-label={t("heroImagePlaceholderAria")}
                >
                  <User className="h-20 w-20 text-[#0f2347]/25 sm:h-24 sm:w-24" strokeWidth={1.25} aria-hidden />
                  <span className="max-w-[12rem] text-center text-xs font-bold uppercase tracking-wider text-[#0f2347]/45">
                    {t("heroImagePlaceholderHint")}
                  </span>
                </div>
              )}

              <FloatingEmojiCard
                emoji="🎤"
                label="Microphone"
                className="absolute left-3 top-[6%] z-20 sm:left-5 sm:top-[8%] lg:left-6"
                floatDuration={3.5}
                shiftX={micShiftX}
                shiftY={micShiftY}
                reducedMotion={reducedMotion}
              />
              <FloatingEmojiCard
                emoji="📷"
                label="Camera"
                className="absolute right-3 top-[7%] z-20 sm:right-5 sm:top-[9%] lg:right-6"
                floatDuration={4}
                shiftX={camShiftX}
                shiftY={camShiftY}
                reducedMotion={reducedMotion}
              />
              <FloatingEmojiCard
                emoji="📚"
                label="Books"
                className="absolute bottom-[10%] right-3 z-20 sm:right-6 sm:bottom-[12%]"
                floatDuration={3.3}
                shiftX={bookShiftX}
                shiftY={bookShiftY}
                reducedMotion={reducedMotion}
              />
              <FloatingEmojiCard
                emoji="⭐"
                label="Star"
                className="absolute left-2 top-[38%] z-20 sm:left-4 sm:top-[40%] lg:left-5"
                floatDuration={3.8}
                shiftX={starShiftX}
                shiftY={starShiftY}
                reducedMotion={reducedMotion}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
