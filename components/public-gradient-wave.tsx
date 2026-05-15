"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";

const WAVE_PATH =
  "M0,55 C240,95 480,25 720,50 C960,75 1200,105 1440,70 L1440,120 L0,120 Z";

type PublicGradientWaveProps = {
  className?: string;
  /** Flip vertically (e.g. wave at top of a light block) */
  flip?: boolean;
};

/**
 * Full-width decorative wave with horizontal brand gradient.
 * `preserveAspectRatio="none"` keeps the curve aligned edge-to-edge at any viewport width.
 */
export function PublicGradientWave({ className, flip }: PublicGradientWaveProps) {
  const gradId = `pub-wave-grad-${useId().replace(/:/g, "")}`;

  return (
    <div className={cn("w-full leading-[0]", className)} aria-hidden>
      <svg
        viewBox="0 0 1440 120"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className={cn("block h-[min(20vw,100px)] w-full min-h-[48px]", flip && "scale-y-[-1]")}
        style={{
          display: "block",
          width: "100%",
          marginTop: flip ? 0 : -1,
          marginBottom: flip ? -1 : 0
        }}
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FF2A7A" />
            <stop offset="50%" stopColor="#6C63FF" />
            <stop offset="100%" stopColor="#00F0FF" />
          </linearGradient>
        </defs>
        <path fill={`url(#${gradId})`} d={WAVE_PATH} />
      </svg>
    </div>
  );
}
