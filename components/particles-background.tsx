"use client";

import { useEffect, useMemo, useState } from "react";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

import { DEFAULT_HERO_BG_COLOR, parseHeroBgColor } from "@/lib/conference-settings";

type ParticlesBackgroundProps = {
  bgColor?: string;
};

export default function ParticlesBackground({ bgColor }: ParticlesBackgroundProps) {
  const [init, setInit] = useState(false);
  const color = parseHeroBgColor(bgColor ?? DEFAULT_HERO_BG_COLOR);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setInit(true));
  }, []);

  const options = useMemo(
    () => ({
      background: { color: { value: color } },
      particles: {
        color: { value: "#ffffff" },
        links: {
          color: "#ffffff",
          distance: 150,
          enable: true,
          opacity: 0.3,
          width: 1
        },
        move: { enable: true, speed: 1.5 },
        number: { value: 80 },
        opacity: { value: 0.5 },
        size: { value: { min: 1, max: 3 } }
      },
      interactivity: {
        events: {
          onHover: { enable: true, mode: "repulse" }
        }
      }
    }),
    [color]
  );

  if (!init) {
    return <div className="pointer-events-none absolute inset-0 z-0" style={{ backgroundColor: color }} aria-hidden />;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-0" style={{ backgroundColor: color }} aria-hidden>
      <Particles key={color} className="absolute inset-0 h-full w-full" options={options} />
    </div>
  );
}
