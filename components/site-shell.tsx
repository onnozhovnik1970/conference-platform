"use client";

import type { ReactNode } from "react";

import { Footer } from "@/components/footer";
import { SiteHeader } from "@/components/site-header";

import { cn } from "@/lib/utils";

/** @deprecated Prefer `app/(public)/layout.tsx` structure; kept for compatibility. */
export function SiteShell({
  children,
  contentClassName
}: {
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className={cn("min-h-0 flex-1", contentClassName)}>{children}</div>
      <Footer />
    </div>
  );
}
