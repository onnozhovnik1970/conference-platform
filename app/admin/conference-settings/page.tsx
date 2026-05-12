"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useConferenceSettings } from "@/components/conference-settings-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConferenceSectionRow } from "@/lib/conference-sections";
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
  const [zoomLink, setZoomLink] = useState("");
  const [zoomDetails, setZoomDetails] = useState("");

  const [sections, setSections] = useState<ConferenceSectionRow[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [sectionsError, setSectionsError] = useState<string | null>(null);
  const [sectionBusyId, setSectionBusyId] = useState<string | null>(null);
  const [newLabelEn, setNewLabelEn] = useState("");
  const [newLabelUa, setNewLabelUa] = useState("");

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

  const loadSections = useCallback(async () => {
    setSectionsError(null);
    setSectionsLoading(true);
    const { response, missingSession } = await fetchAsAdmin("/api/admin/conference-sections");
    if (missingSession || !response?.ok) {
      setSectionsError(t("adminSectionsLoadError"));
      setSectionsLoading(false);
      return;
    }
    const json = (await response.json()) as { sections: ConferenceSectionRow[] };
    setSections(json.sections ?? []);
    setSectionsLoading(false);
  }, [fetchAsAdmin, t]);

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
        setZoomLink(s.zoom_link ?? "");
        setZoomDetails(s.zoom_details ?? "");
      }
      setLoading(false);
    };
    void load();
  }, [fetchAsAdmin, t]);

  useEffect(() => {
    void loadSections();
  }, [loadSections]);

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
          description: description.trim() || null,
          zoom_link: zoomLink.trim() || null,
          zoom_details: zoomDetails.trim() || null
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

  const updateSectionLocal = (id: string, patch: Partial<Pick<ConferenceSectionRow, "label_en" | "label_ua" | "sort_order">>) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const handleSaveSection = async (row: ConferenceSectionRow) => {
    setSectionsError(null);
    setSectionBusyId(row.id);
    try {
      const { response, missingSession } = await fetchAsAdmin(`/api/admin/conference-sections/${encodeURIComponent(row.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          label_en: row.label_en.trim(),
          label_ua: row.label_ua.trim(),
          sort_order: row.sort_order
        })
      });
      if (missingSession || !response?.ok) {
        const body = response ? ((await response.json().catch(() => null)) as { error?: string } | null) : null;
        setSectionsError(body?.error?.trim() || t("adminSectionsSaveError"));
        await loadSections();
        return;
      }
      await loadSections();
    } catch {
      setSectionsError(t("adminSectionsSaveError"));
      await loadSections();
    } finally {
      setSectionBusyId(null);
    }
  };

  const handleDeleteSection = async (row: ConferenceSectionRow) => {
    if (!globalThis.confirm(t("adminSectionsDeleteConfirm"))) {
      return;
    }
    setSectionsError(null);
    setSectionBusyId(row.id);
    try {
      const { response, missingSession } = await fetchAsAdmin(`/api/admin/conference-sections/${encodeURIComponent(row.id)}`, {
        method: "DELETE"
      });
      if (missingSession || !response?.ok) {
        if (response?.status === 409) {
          setSectionsError(t("adminSectionsDeleteBlocked"));
        } else if (response) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          setSectionsError(body?.error?.trim() || t("adminSectionsDeleteError"));
        } else {
          setSectionsError(t("adminSectionsDeleteError"));
        }
        return;
      }
      await loadSections();
    } catch {
      setSectionsError(t("adminSectionsDeleteError"));
    } finally {
      setSectionBusyId(null);
    }
  };

  const handleAddSection = async () => {
    const en = newLabelEn.trim();
    const ua = newLabelUa.trim();
    if (!en || !ua) {
      return;
    }
    setSectionsError(null);
    setSectionBusyId("__new__");
    try {
      const { response, missingSession } = await fetchAsAdmin("/api/admin/conference-sections", {
        method: "POST",
        body: JSON.stringify({ label_en: en, label_ua: ua })
      });
      if (missingSession || !response?.ok) {
        const body = response ? ((await response.json().catch(() => null)) as { error?: string } | null) : null;
        setSectionsError(body?.error?.trim() || t("adminSectionsSaveError"));
        return;
      }
      setNewLabelEn("");
      setNewLabelUa("");
      await loadSections();
    } catch {
      setSectionsError(t("adminSectionsSaveError"));
    } finally {
      setSectionBusyId(null);
    }
  };

  const inputClass =
    "mt-2 w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40";
  const labelClass = "block text-sm font-medium text-slate-100";

  return (
    <div className="space-y-6">
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
              <div>
                <label className={labelClass} htmlFor="cs-zoom-link">
                  {t("adminConferenceFieldZoomLink")}
                </label>
                <input
                  id="cs-zoom-link"
                  type="text"
                  inputMode="url"
                  autoComplete="off"
                  placeholder="https://zoom.us/j/..."
                  value={zoomLink}
                  onChange={(e) => setZoomLink(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="cs-zoom-details">
                  {t("adminConferenceFieldZoomDetails")}
                </label>
                <textarea
                  id="cs-zoom-details"
                  rows={4}
                  placeholder={t("adminConferenceFieldZoomDetailsPlaceholder")}
                  value={zoomDetails}
                  onChange={(e) => setZoomDetails(e.target.value)}
                  className={`${inputClass} min-h-[6rem]`}
                />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? t("adminConferenceSettingsSaving") : t("adminConferenceSettingsSave")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-black/35 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl text-white">{t("adminSectionsTitle")}</CardTitle>
          <CardDescription className="text-slate-300">{t("adminSectionsSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {sectionsLoading && <p className="text-slate-300">{t("adminSectionsLoading")}</p>}
          {!sectionsLoading && sectionsError && (
            <div className="rounded-md border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{sectionsError}</div>
          )}
          {!sectionsLoading && sections.length === 0 && (
            <p className="text-slate-300">{t("adminSectionsEmpty")}</p>
          )}
          {!sectionsLoading && sections.length > 0 && (
            <div className="space-y-4">
              {sections.map((row) => {
                const busy = sectionBusyId === row.id;
                return (
                  <div
                    key={row.id}
                    className="grid gap-3 rounded-lg border border-white/15 bg-black/25 p-4 md:grid-cols-[1fr_1fr_6rem_auto] md:items-end"
                  >
                    <div>
                      <label className={labelClass} htmlFor={`sec-en-${row.id}`}>
                        {t("adminSectionsLabelEn")}
                      </label>
                      <input
                        id={`sec-en-${row.id}`}
                        value={row.label_en}
                        onChange={(e) => updateSectionLocal(row.id, { label_en: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor={`sec-ua-${row.id}`}>
                        {t("adminSectionsLabelUa")}
                      </label>
                      <input
                        id={`sec-ua-${row.id}`}
                        value={row.label_ua}
                        onChange={(e) => updateSectionLocal(row.id, { label_ua: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor={`sec-ord-${row.id}`}>
                        {t("adminSectionsOrder")}
                      </label>
                      <input
                        id={`sec-ord-${row.id}`}
                        type="number"
                        value={row.sort_order}
                        onChange={(e) => updateSectionLocal(row.id, { sort_order: Number.parseInt(e.target.value, 10) || 0 })}
                        className={inputClass}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <Button type="button" size="sm" disabled={busy} onClick={() => void handleSaveSection(row)}>
                        {busy ? t("adminSectionsSaving") : t("adminSectionsSave")}
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="border-rose-400/50 text-rose-200 hover:bg-rose-500/10" disabled={busy} onClick={() => void handleDeleteSection(row)}>
                        {t("adminSectionsDelete")}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="rounded-lg border border-dashed border-white/20 bg-white/5 p-4">
            <p className="text-sm font-medium text-slate-200">{t("adminSectionsAdd")}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="new-sec-en">
                  {t("adminSectionsLabelEn")}
                </label>
                <input id="new-sec-en" value={newLabelEn} onChange={(e) => setNewLabelEn(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass} htmlFor="new-sec-ua">
                  {t("adminSectionsLabelUa")}
                </label>
                <input id="new-sec-ua" value={newLabelUa} onChange={(e) => setNewLabelUa(e.target.value)} className={inputClass} />
              </div>
            </div>
            <Button
              type="button"
              className="mt-3"
              disabled={sectionBusyId !== null || !newLabelEn.trim() || !newLabelUa.trim()}
              onClick={() => void handleAddSection()}
            >
              {sectionBusyId === "__new__" ? t("adminSectionsSaving") : t("adminSectionsAdd")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
