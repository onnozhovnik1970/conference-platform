"use client";

import type { ISourceOptions } from "@tsparticles/engine";
import { useEffect, useMemo, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

import { DEFAULT_HERO_BG_COLOR, parseHeroBgColor } from "@/lib/conference-settings";

const MOBILE_MAX_WIDTH = 767;
const MOBILE_PARTICLE_COUNT = 40;
const DESKTOP_PARTICLE_COUNT = 80;

type ParticlesBackgroundProps = {
  bgColor?: string;
};

function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isMobile;
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return prefersReducedMotion;
}

/** Defer heavy work until the main thread is idle (post-interactive). */
function useAfterInteractive() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const run = () => setReady(true);
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(run, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(run, 0);
    return () => window.clearTimeout(id);
  }, []);

  return ready;
}

export default function ParticlesBackground({ bgColor }: ParticlesBackgroundProps) {
  const [init, setInit] = useState(false);
  const afterInteractive = useAfterInteractive();
  const isMobile = useIsMobileViewport();
  const prefersReducedMotion = usePrefersReducedMotion();
  const color = parseHeroBgColor(bgColor ?? DEFAULT_HERO_BG_COLOR);

  useEffect(() => {
    if (!afterInteractive) {
      return;
    }

    let cancelled = false;

    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      if (!cancelled) {
        setInit(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [afterInteractive]);

  const particleCount = isMobile ? MOBILE_PARTICLE_COUNT : DESKTOP_PARTICLE_COUNT;

  const options = useMemo((): ISourceOptions => {
    const lowMotion = prefersReducedMotion;

    return {
      background: { color: { value: color } },
      fpsLimit: lowMotion ? 30 : 60,
      reducedMotion: {
        enable: true,
        minimumFps: 30
      },
      particles: {
        color: { value: "#ffffff" },
        links: {
          color: "#ffffff",
          distance: 150,
          enable: !lowMotion,
          opacity: 0.3,
          width: 1
        },
        move: { enable: !lowMotion, speed: lowMotion ? 0 : 1.5 },
        number: { value: particleCount },
        opacity: { value: 0.5 },
        size: { value: { min: 1, max: 3 } }
      },
      interactivity: {
        events: {
          onHover: { enable: !lowMotion, mode: "repulse" }
        }
      }
    };
  }, [color, particleCount, prefersReducedMotion]);

  if (!init) {
    return (
      <div
        className="pointer-events-none absolute inset-0 z-0 h-full w-full"
        style={{ backgroundColor: color, zIndex: 0 }}
        aria-hidden
      />
    );
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-hidden"
      style={{ backgroundColor: color, zIndex: 0 }}
      aria-hidden
    >
      <Particles
        key={`${color}-${particleCount}-${prefersReducedMotion}`}
        className="absolute inset-0 h-full w-full"
        style={{ zIndex: 0 }}
        options={options}
      />
    </div>
  );
}

