"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useConferenceSettings } from "@/components/conference-settings-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConferenceSettingsRow } from "@/lib/conference-settings";
import "@/lib/i18n/config";
import { supabase } from "@/lib/supabase";

export default function AdminConferenceSettingsPage() {
  const { t } = useTranslation();
  const { refresh } = useConferenceSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

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
      const { response, missingSession } = await fetchAsAdmin("/api/admin/conference-settings");
      if (missingSession || !response?.ok) {
        setError(t("adminConferenceSettingsLoadError"));
        setLoading(false);
        return;
      }
      const json = (await response.json()) as { settings: ConferenceSettingsRow };
      const s = json.settings;
      if (s) {
        setTitle(s.title ?? "");
        setEventDate(s.date ?? "");
        setDeadline(s.deadline ?? "");
        setLocation(s.location ?? "");
        setDescription(s.description ?? "");
      }
      setLoading(false);
    };
    void load();
  }, [fetchAsAdmin, t]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const { response, missingSession } = await fetchAsAdmin("/api/admin/conference-settings", {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim(),
          date: eventDate || null,
          deadline: deadline || null,
          location: location.trim() || null,
          description: description.trim() || null
        })
      });
      if (missingSession || !response?.ok) {
        const body = response ? ((await response.json().catch(() => null)) as { error?: string } | null) : null;
        setError(body?.error?.trim() || t("adminConferenceSettingsSaveError"));
        return;
      }
      setSuccess(t("adminConferenceSettingsSaveSuccess"));
      await refresh();
    } catch {
      setError(t("adminConferenceSettingsSaveError"));
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "mt-2 w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40";
  const labelClass = "block text-sm font-medium text-slate-100";

  return (
    <Card className="border-white/10 bg-black/35 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-2xl text-white">{t("adminNavConferenceSettings")}</CardTitle>
        <CardDescription className="text-slate-300">{t("adminConferenceSettingsSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && <p className="text-slate-300">{t("adminConferenceSettingsLoading")}</p>}
        {!loading && (
          <form onSubmit={(e) => void handleSubmit(e)} className="max-w-2xl space-y-4">
            {error && (
              <div className="rounded-md border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>
            )}
            {success && (
              <div className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{success}</div>
            )}
            <div>
              <label className={labelClass} htmlFor="cs-title">
                {t("adminConferenceFieldTitle")}
              </label>
              <textarea
                id="cs-title"
                required
                rows={3}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`${inputClass} min-h-[5rem]`}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="cs-date">
                  {t("adminConferenceFieldDate")}
                </label>
                <input id="cs-date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass} htmlFor="cs-deadline">
                  {t("adminConferenceFieldDeadline")}
                </label>
                <input id="cs-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass} htmlFor="cs-location">
                {t("adminConferenceFieldLocation")}
              </label>
              <input id="cs-location" type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="cs-description">
                {t("adminConferenceFieldDescription")}
              </label>
              <textarea
                id="cs-description"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`${inputClass} min-h-[8rem]`}
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? t("adminConferenceSettingsSaving") : t("adminConferenceSettingsSave")}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
