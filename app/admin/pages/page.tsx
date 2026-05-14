"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EDITABLE_PAGES_META, type EditablePageSlug, type PageContentRow } from "@/lib/editable-pages";
import "@/lib/i18n/config";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export default function AdminPagesEditorPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pages, setPages] = useState<PageContentRow[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<EditablePageSlug>(EDITABLE_PAGES_META[0].slug);

  const [titleUa, setTitleUa] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [contentUa, setContentUa] = useState("");
  const [contentEn, setContentEn] = useState("");

  const fetchAsAdmin = useCallback(async (input: string, init?: RequestInit) => {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return { response: null as Response | null, missingSession: true as const };
    }
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${session.access_token}`);
    if (init?.body != null && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const response = await fetch(input, { ...init, headers, cache: "no-store" });
    return { response, missingSession: false as const };
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      const { response, missingSession } = await fetchAsAdmin("/api/admin/page-contents");
      if (missingSession || !response?.ok) {
        setError(t("adminPagesLoadError"));
        setLoading(false);
        return;
      }
      const json = (await response.json()) as { pages: PageContentRow[] };
      const list = json.pages ?? [];
      setPages(list);
      const first = list[0];
      if (first) {
        setSelectedSlug(first.id as EditablePageSlug);
      }
      setLoading(false);
    };
    void load();
  }, [fetchAsAdmin, t]);

  useEffect(() => {
    const row = pages.find((p) => p.id === selectedSlug);
    if (row) {
      setTitleUa(row.title_ua ?? "");
      setTitleEn(row.title_en ?? "");
      setContentUa(row.content_ua ?? "");
      setContentEn(row.content_en ?? "");
    }
  }, [pages, selectedSlug]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    const { response, missingSession } = await fetchAsAdmin("/api/admin/page-contents", {
      method: "PUT",
      body: JSON.stringify({
        id: selectedSlug,
        title_ua: titleUa,
        title_en: titleEn,
        content_ua: contentUa,
        content_en: contentEn
      })
    });
    if (missingSession || !response?.ok) {
      setError(t("adminPagesSaveError"));
      setSaving(false);
      return;
    }
    const json = (await response.json()) as { page: PageContentRow };
    if (json.page) {
      setPages((prev) => {
        const next = prev.filter((p) => p.id !== json.page.id);
        next.push(json.page);
        return next.sort(
          (a, b) =>
            EDITABLE_PAGES_META.findIndex((m) => m.slug === a.id) - EDITABLE_PAGES_META.findIndex((m) => m.slug === b.id)
        );
      });
    }
    setSuccess(t("adminPagesSaved"));
    setSaving(false);
  };

  const inputClass =
    "mt-2 w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40";
  const labelClass = "block text-sm font-medium text-slate-100";

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <aside className="w-full shrink-0 lg:w-56">
        <Card className="border-white/10 bg-black/35 backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-white">{t("adminPagesSidebarTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            {EDITABLE_PAGES_META.map((item) => (
              <button
                key={item.slug}
                type="button"
                onClick={() => {
                  setSuccess(null);
                  setError(null);
                  setSelectedSlug(item.slug);
                }}
                className={cn(
                  "w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
                  selectedSlug === item.slug
                    ? "bg-primary text-primary-foreground"
                    : "text-slate-200 hover:bg-white/10 hover:text-white"
                )}
              >
                {t(item.fallbackTitleKey)}
              </button>
            ))}
          </CardContent>
        </Card>
      </aside>

      <div className="min-w-0 flex-1">
        <Card className="border-white/10 bg-black/35 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl text-white">{t("adminNavPages")}</CardTitle>
            <CardDescription className="text-slate-300">{t("adminPagesSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-300">{t("adminPagesLoading")}</p>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                {error ? <p className="text-sm text-red-300">{error}</p> : null}
                {success ? <p className="text-sm text-emerald-300">{success}</p> : null}

                <div>
                  <label className={labelClass} htmlFor="page-title-ua">
                    {t("adminPagesTitleUa")}
                  </label>
                  <input
                    id="page-title-ua"
                    type="text"
                    autoComplete="off"
                    value={titleUa}
                    onChange={(e) => setTitleUa(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="page-title-en">
                    {t("adminPagesTitleEn")}
                  </label>
                  <input
                    id="page-title-en"
                    type="text"
                    autoComplete="off"
                    value={titleEn}
                    onChange={(e) => setTitleEn(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="page-content-ua">
                    {t("adminPagesContentUa")}
                  </label>
                  <p className="mt-1 text-xs text-slate-400">{t("adminPagesContentHint")}</p>
                  <textarea
                    id="page-content-ua"
                    rows={14}
                    value={contentUa}
                    onChange={(e) => setContentUa(e.target.value)}
                    className={`${inputClass} min-h-[12rem] font-mono text-xs md:text-sm`}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="page-content-en">
                    {t("adminPagesContentEn")}
                  </label>
                  <p className="mt-1 text-xs text-slate-400">{t("adminPagesContentHint")}</p>
                  <textarea
                    id="page-content-en"
                    rows={14}
                    value={contentEn}
                    onChange={(e) => setContentEn(e.target.value)}
                    className={`${inputClass} min-h-[12rem] font-mono text-xs md:text-sm`}
                  />
                </div>

                <Button disabled={saving} type="submit" className="min-w-[8rem]">
                  {saving ? t("adminSaving") : t("adminSave")}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
