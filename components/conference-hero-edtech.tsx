"use client";

import { motion, useMotionValue, useReducedMotion, useTransform, type MotionValue } from "framer-motion";
import { BookOpen, Calendar, MapPin, Mic, Video, type LucideIcon } from "lucide-react";
import { Inter, Playfair_Display } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useRef } from "react";

const interHero = Inter({
  subsets: ["latin", "cyrillic"],
  display: "swap"
});

const playfairAccent = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  style: ["italic"],
  weight: ["500", "600", "700"],
  display: "swap"
});

const ACCENT = "#0f2347";
const ACCENT_SOFT = "#15325e";

const STUDENT_IMAGE =
  "https://images.unsplash.com/photo-1573496359142-b8d87734a7a2?auto=format&fit=crop&w=800&q=80";

const glassCard =
  "rounded-2xl border border-white/70 bg-white/40 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-md md:p-8";

const glassIconShell =
  "flex h-12 w-12 items-center justify-center rounded-xl border border-white/60 bg-white/30 shadow-lg backdrop-blur-md sm:h-14 sm:w-14 md:h-16 md:w-16";

const fadeUp = {
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const }
};

type FloatingIconProps = {
  icon: LucideIcon;
  className: string;
  floatDuration: number;
  shiftX: MotionValue<number>;
  shiftY: MotionValue<number>;
  reducedMotion: boolean | null;
};

function FloatingIconCard({ icon: Icon, className, floatDuration, shiftX, shiftY, reducedMotion }: FloatingIconProps) {
  return (
    <motion.div className={className} style={{ x: shiftX, y: shiftY }}>
      <motion.div
        animate={reducedMotion ? undefined : { y: [0, -9, 0] }}
        transition={
          reducedMotion
            ? undefined
            : { duration: floatDuration, repeat: Infinity, ease: "easeInOut" as const }
        }
        className={glassIconShell}
      >
        <Icon className="h-5 w-5 text-[#0f2347] sm:h-6 sm:w-6 md:h-7 md:w-7" strokeWidth={2} />
      </motion.div>
    </motion.div>
  );
}

/**
 * Modern EdTech-style hero: light canvas, gradient blobs, glass panels, Inter + Playfair Display,
 * Framer Motion entrance + floating icons + cursor parallax.
 */
export function ConferenceHeroEdtech() {
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();

  const mouseNormX = useMotionValue(0);
  const mouseNormY = useMotionValue(0);

  const micShiftX = useTransform(mouseNormX, (x) => x * 22);
  const micShiftY = useTransform(mouseNormY, (y) => y * 16);
  const camShiftX = useTransform(mouseNormX, (x) => x * -18);
  const camShiftY = useTransform(mouseNormY, (y) => y * 20);
  const bookShiftX = useTransform(mouseNormX, (x) => x * 14);
  const bookShiftY = useTransform(mouseNormY, (y) => y * -14);

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
      className={`relative overflow-hidden bg-white ${interHero.className}`}
    >
      {/* Gradient blobs */}
      <div
        className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-sky-300/50 blur-3xl md:h-96 md:w-96"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 top-32 h-80 w-80 rounded-full bg-fuchsia-200/45 blur-3xl md:h-[28rem] md:w-[28rem]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-[120%] max-w-4xl -translate-x-1/2 rounded-full bg-blue-100/60 blur-3xl"
        aria-hidden
      />

      <div className="container relative z-10 py-10 md:py-16 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          {/* Left column */}
          <div className="order-2 max-w-xl lg:order-1">
            <motion.div
              initial={fadeUp.initial}
              whileInView={fadeUp.animate}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ ...fadeUp.transition, delay: 0.05 }}
              className="mb-5 inline-flex flex-wrap items-center gap-2 rounded-full border border-white/80 bg-white/45 px-3 py-2 text-xs font-medium text-[#0f2347] shadow-sm backdrop-blur-md sm:gap-2.5 sm:px-4 sm:text-sm"
            >
              <span className="inline-flex items-center gap-1.5 text-[#0f2347]/90">
                <Calendar className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
                May 14, 2026
              </span>
              <span className="hidden text-slate-300 sm:inline" aria-hidden>
                ·
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#0f2347]/90">
                <MapPin className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
                Kyiv, Ukraine
              </span>
              <span className="hidden text-slate-300 sm:inline" aria-hidden>
                ·
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#0f2347]/90">
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
                className="text-balance text-3xl font-extrabold leading-[1.12] tracking-tight sm:text-4xl md:text-5xl lg:text-[2.75rem] lg:leading-[1.1] xl:text-5xl"
                style={{ color: ACCENT }}
              >
                <span className="block">
                  THE SCIENCE OF THE{" "}
                  <span className={`${playfairAccent.className} font-semibold italic`} style={{ color: ACCENT_SOFT }}>
                    XXI CENTURY
                  </span>
                  <span className="font-black">:</span>
                </span>
                <span className="mt-2 block sm:mt-3">
                  <span className={`${playfairAccent.className} font-semibold italic`} style={{ color: ACCENT_SOFT }}>
                    CHALLENGES
                  </span>{" "}
                  OF{" "}
                  <span className={`${playfairAccent.className} font-semibold italic`} style={{ color: ACCENT_SOFT }}>
                    CONTEMPORANEITY
                  </span>
                </span>
              </h1>

              <p className="mt-5 text-base font-medium leading-relaxed text-slate-600 sm:text-lg">
                IX All-Ukrainian Student Scientific and Practical Conference in Foreign Languages
              </p>

              <motion.div
                initial={fadeUp.initial}
                whileInView={fadeUp.animate}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ ...fadeUp.transition, delay: 0.22 }}
                className="mt-8"
              >
                <Link
                  href="/register"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl px-8 py-3 text-base font-semibold text-white shadow-lg shadow-[#0f2347]/25 transition-transform duration-200 hover:scale-[1.04] active:scale-[0.98] sm:min-h-14 sm:px-10 sm:text-lg"
                  style={{ backgroundColor: ACCENT }}
                >
                  Register Now
                </Link>
              </motion.div>
            </motion.div>
          </div>

          {/* Right column — image + floating icons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            className="relative order-1 mx-auto w-full max-w-md lg:order-2 lg:max-w-none lg:justify-self-end"
          >
            <div className="relative aspect-[4/5] w-full max-w-md overflow-visible sm:mx-auto lg:ml-auto lg:mr-0 lg:max-w-lg">
              <div
                className="absolute inset-0 rounded-[2rem] border border-white/80 bg-gradient-to-br from-white/50 to-white/20 shadow-2xl shadow-slate-900/10 backdrop-blur-md"
                aria-hidden
              />
              <div className="relative h-full w-full overflow-hidden rounded-[2rem] border border-white/60 bg-slate-100/80">
                <Image
                  src={STUDENT_IMAGE}
                  alt="Student participant"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover object-top"
                />
              </div>

              <FloatingIconCard
                icon={Mic}
                className="absolute -left-1 top-[8%] z-20 sm:left-0 md:top-[10%]"
                floatDuration={3.6}
                shiftX={micShiftX}
                shiftY={micShiftY}
                reducedMotion={reducedMotion}
              />
              <FloatingIconCard
                icon={Video}
                className="absolute -right-1 bottom-[18%] z-20 sm:right-0 md:bottom-[20%]"
                floatDuration={4.2}
                shiftX={camShiftX}
                shiftY={camShiftY}
                reducedMotion={reducedMotion}
              />
              <FloatingIconCard
                icon={BookOpen}
                className="absolute -bottom-2 left-[12%] z-20 sm:bottom-0 sm:left-[14%]"
                floatDuration={3.2}
                shiftX={bookShiftX}
                shiftY={bookShiftY}
                reducedMotion={reducedMotion}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
