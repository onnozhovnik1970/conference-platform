"use client";

import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import "@/lib/i18n/config";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.language === "ua" ? "ua" : "en";

  const setLanguage = (lang: "en" | "ua") => {
    void i18n.changeLanguage(lang);
  };

  return (
    <div className="inline-flex items-center rounded-md border border-white/20 bg-white/10 p-1 backdrop-blur">
      <Button
        size="sm"
        variant={current === "ua" ? "default" : "outline"}
        className="h-8 border-0"
        onClick={() => setLanguage("ua")}
      >
        UA
      </Button>
      <Button
        size="sm"
        variant={current === "en" ? "default" : "outline"}
        className="h-8 border-0"
        onClick={() => setLanguage("en")}
      >
        EN
      </Button>
    </div>
  );
}
