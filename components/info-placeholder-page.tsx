"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import "@/lib/i18n/config";

export function InfoPlaceholderPage({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation();

  return (
    <main className="flex min-h-[min(70vh,720px)] flex-col items-center justify-center px-4 py-16">
      <div className="max-w-xl text-center">
        <h1 className="text-balance text-2xl font-bold text-white md:text-3xl">{t(titleKey)}</h1>
        <p className="mt-4 text-slate-300">{t("infoPlaceholderBody")}</p>
        <Button asChild className="mt-8 border-white/25 bg-white/10 text-white hover:bg-white/15" variant="outline">
          <Link href="/">{t("navHome")}</Link>
        </Button>
      </div>
    </main>
  );
}
