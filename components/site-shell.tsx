"use client";

import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import { cn } from "@/lib/utils";

export function SiteShell({
  children,
  contentClassName
}: {
  children: ReactNode;
  /** Extra classes on the main content wrapper (e.g. public light theme). */
  contentClassName?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className={cn("flex-1", contentClassName)}>{children}</div>
      <SiteFooter />
    </div>
  );
}
