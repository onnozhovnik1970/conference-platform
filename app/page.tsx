"use client";

import { Atom, BookOpen, Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import "@/lib/i18n/config";

const steps = [
  { icon: BookOpen, titleKey: "step1Title", descriptionKey: "step1Description" },
  { icon: Atom, titleKey: "step2Title", descriptionKey: "step2Description" },
  { icon: Sparkles, titleKey: "step3Title", descriptionKey: "step3Description" }
] as const;

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <main className="min-h-screen">
      <section className="animated-academic-gradient relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.25),_transparent_45%)]" />

        <div className="container relative z-10 py-6 md:py-8">
          <header className="flex items-center justify-between">
            <div className="text-lg font-semibold tracking-tight text-white">{t("navBrand")}</div>
            <div className="flex items-center gap-3">
              <Button asChild variant="secondary" size="sm">
                <Link href="/register">{t("navRegister")}</Link>
              </Button>
              <LanguageSwitcher />
            </div>
          </header>

          <div className="mx-auto max-w-4xl py-20 text-center md:py-28">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl">{t("heroTitle")}</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-blue-100 sm:text-xl">{t("heroSubtitle")}</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="min-w-44">
                {t("submitAbstract")}
              </Button>
              <Button size="lg" variant="secondary" className="min-w-44">
                {t("viewConferences")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-14 md:py-20">
        <h2 className="mb-8 text-center text-3xl font-bold md:mb-10">{t("howItWorks")}</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map(({ icon: Icon, titleKey, descriptionKey }, index) => (
            <Card key={titleKey} className="border-white/10 bg-white/5">
              <CardHeader>
                <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <CardTitle>{`${index + 1}. ${t(titleKey)}`}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-6 text-slate-300">{t(descriptionKey)}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 bg-black/30 py-8">
        <div className="container flex flex-col items-center justify-between gap-3 text-sm text-slate-300 sm:flex-row">
          <p>{t("footer")}</p>
          <p>{new Date().getFullYear()} Conference Platform</p>
        </div>
      </footer>
    </main>
  );
}
