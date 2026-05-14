"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useConferenceSettings } from "@/components/conference-settings-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { datetimeLocalValueToIso, isoToDatetimeLocalValue } from "@/lib/conference-dates";
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
  const [titleUa, setTitleUa] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [heroSubtitleUa, setHeroSubtitleUa] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [location, setLocation] = useState("");
  const [plenaryStartLocal, setPlenaryStartLocal] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionUa, setDescriptionUa] = useState("");
  const [zoomLink, setZoomLink] = useState("");
  const [zoomDetails, setZoomDetails] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [supportPhone, setSupportPhone] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [telegramUrl, setTelegramUrl] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");

  const [sections, setSections] = useState<ConferenceSectionRow[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [sectionsError, setSectionsError] = useState<string | null>(null);
  const [sectionBusyId, setSectionBusyId] = useState<string | null>(null);
  const [newLabelEn, setNewLabelEn] = useState("");
  const [newLabelUa, setNewLabelUa] = useState("");

  const [reminderBusy, setReminderBusy] = useState<"preview" | "send" | null>(null);
  const [reminderNotice, setReminderNotice] = useState<string | null>(null);
  const [reminderErr, setReminderErr] = useState<string | null>(null);

  const [programBusy, setProgramBusy] = useState<"preview" | "send" | null>(null);
  const [programNotice, setProgramNotice] = useState<string | null>(null);
  const [programErr, setProgramErr] = useState<string | null>(null);

  const [certificatesZipBusy, setCertificatesZipBusy] = useState(false);
  const [certificatesSendAllBusy, setCertificatesSendAllBusy] = useState(false);
  const [certificatesErr, setCertificatesErr] = useState<string | null>(null);
  const [certificatesNotice, setCertificatesNotice] = useState<string | null>(null);

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
        setTitleUa(s.title_ua ?? "");
        setHeroSubtitle(s.hero_subtitle ?? "");
        setHeroSubtitleUa(s.hero_subtitle_ua ?? "");
        setEventDate(s.date ?? "");
        setDeadline(s.deadline ?? "");
        setLocation(s.location ?? "");
        setPlenaryStartLocal(isoToDatetimeLocalValue(s.plenary_start_time));
        setDescription(s.description ?? "");
        setDescriptionUa(s.description_ua ?? "");
        setZoomLink(s.zoom_link ?? "");
        setZoomDetails(s.zoom_details ?? "");
        setMetaTitle(s.meta_title ?? "");
        setMetaDescription(s.meta_description ?? "");
        setSupportPhone(s.support_phone ?? "");
        setSupportEmail(s.support_email ?? "");
        setFacebookUrl(s.facebook_url ?? "");
        setInstagramUrl(s.instagram_url ?? "");
        setTelegramUrl(s.telegram_url ?? "");
        setHeroImageUrl(s.hero_image_url ?? "");
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
          title_ua: titleUa.trim() || null,
          hero_subtitle: heroSubtitle.trim() || null,
          hero_subtitle_ua: heroSubtitleUa.trim() || null,
          date: eventDate || null,
          deadline: deadline || null,
          location: location.trim() || null,
          plenary_start_time: datetimeLocalValueToIso(plenaryStartLocal),
          description: description.trim() || null,
          description_ua: descriptionUa.trim() || null,
          zoom_link: zoomLink.trim() || null,
          zoom_details: zoomDetails.trim() || null,
          meta_title: metaTitle.trim() || null,
          meta_description: metaDescription.trim() || null,
          support_phone: supportPhone.trim() || null,
          support_email: supportEmail.trim() || null,
          facebook_url: facebookUrl.trim() || null,
          instagram_url: instagramUrl.trim() || null,
          telegram_url: telegramUrl.trim() || null,
          hero_image_url: heroImageUrl.trim() || null
        })
      });
      if (missingSession || !response?.ok) {
        const body = response ? ((await response.json().catch(() => null)) as { error?: string } | null) : null;
        setError(body?.error?.trim() || t("adminConferenceSettingsSaveError"));
        return;
      }
      const saved = (await response.json()) as { settings?: ConferenceSettingsRow };
      if (saved.settings) {
        const s = saved.settings;
        setTitle(s.title ?? "");
        setTitleUa(s.title_ua ?? "");
        setHeroSubtitle(s.hero_subtitle ?? "");
        setHeroSubtitleUa(s.hero_subtitle_ua ?? "");
        setEventDate(s.date ?? "");
        setDeadline(s.deadline ?? "");
        setLocation(s.location ?? "");
        setPlenaryStartLocal(isoToDatetimeLocalValue(s.plenary_start_time));
        setDescription(s.description ?? "");
        setDescriptionUa(s.description_ua ?? "");
        setZoomLink(s.zoom_link ?? "");
        setZoomDetails(s.zoom_details ?? "");
        setMetaTitle(s.meta_title ?? "");
        setMetaDescription(s.meta_description ?? "");
        setSupportPhone(s.support_phone ?? "");
        setSupportEmail(s.support_email ?? "");
        setFacebookUrl(s.facebook_url ?? "");
        setInstagramUrl(s.instagram_url ?? "");
        setTelegramUrl(s.telegram_url ?? "");
        setHeroImageUrl(s.hero_image_url ?? "");
      }
      setSuccess(t("adminConferenceSettingsSaveSuccess"));
      await refresh();
    } catch {
      setError(t("adminConferenceSettingsSaveError"));
    } finally {
      setSaving(false);
    }
  };

  const updateSectionLocal = (id: string, patch: Partial<ConferenceSectionRow>) => {
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
          sort_order: row.sort_order,
          zoom_link: row.zoom_link?.trim() ? row.zoom_link.trim() : null,
          zoom_meeting_id: row.zoom_meeting_id?.trim() ? row.zoom_meeting_id.trim() : null,
          zoom_password: row.zoom_password?.trim() ? row.zoom_password.trim() : null,
          start_time: row.start_time
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

  const runReminder = async (dryRun: boolean) => {
    setReminderErr(null);
    setReminderNotice(null);
    setProgramErr(null);
    setProgramNotice(null);
    setCertificatesErr(null);
    setCertificatesNotice(null);
    setReminderBusy(dryRun ? "preview" : "send");
    try {
      const qs = dryRun ? "?dryRun=true" : "";
      const { response, missingSession } = await fetchAsAdmin(`/api/email/reminder${qs}`, {
        method: "POST",
        body: JSON.stringify({})
      });
      if (missingSession || !response) {
        setReminderErr(t("adminReminderError"));
        return;
      }
      const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (!response.ok) {
        setReminderErr(typeof data?.error === "string" ? data.error : t("adminReminderError"));
        return;
      }
      if (dryRun && data) {
        const count = typeof data.recipientCount === "number" ? data.recipientCount : 0;
        setReminderNotice(t("adminReminderPreviewResult", { count }));
      } else if (!dryRun && data) {
        const sent = typeof data.sent === "number" ? data.sent : 0;
        const recipientCount = typeof data.recipientCount === "number" ? data.recipientCount : 0;
        const skipped = typeof data.skippedNoEmail === "number" ? data.skippedNoEmail : 0;
        const failed = typeof data.failed === "number" ? data.failed : 0;
        setReminderNotice(t("adminReminderSuccess", { sent, recipientCount, skipped, failed }));
      }
    } catch {
      setReminderErr(t("adminReminderError"));
    } finally {
      setReminderBusy(null);
    }
  };

  const handlePreviewReminder = () => void runReminder(true);

  const handleSendReminder = () => {
    if (!globalThis.confirm(t("adminReminderSendConfirm"))) {
      return;
    }
    void runReminder(false);
  };

  const emailBatchIdle = reminderBusy === null && programBusy === null && !certificatesZipBusy && !certificatesSendAllBusy;

  const runProgram = async (dryRun: boolean) => {
    setProgramErr(null);
    setProgramNotice(null);
    setReminderErr(null);
    setReminderNotice(null);
    setCertificatesErr(null);
    setCertificatesNotice(null);
    setProgramBusy(dryRun ? "preview" : "send");
    try {
      const qs = dryRun ? "?dryRun=true" : "";
      const { response, missingSession } = await fetchAsAdmin(`/api/email/program${qs}`, {
        method: "POST",
        body: JSON.stringify({})
      });
      if (missingSession || !response) {
        setProgramErr(t("adminProgramError"));
        return;
      }
      const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (!response.ok) {
        setProgramErr(typeof data?.error === "string" ? data.error : t("adminProgramError"));
        return;
      }
      if (dryRun && data) {
        const count = typeof data.recipientCount === "number" ? data.recipientCount : 0;
        setProgramNotice(t("adminProgramPreviewResult", { count }));
      } else if (!dryRun && data) {
        const sent = typeof data.sent === "number" ? data.sent : 0;
        const recipientCount = typeof data.recipientCount === "number" ? data.recipientCount : 0;
        const skipped = typeof data.skippedNoEmail === "number" ? data.skippedNoEmail : 0;
        const failed = typeof data.failed === "number" ? data.failed : 0;
        setProgramNotice(t("adminProgramSuccess", { sent, recipientCount, skipped, failed }));
      }
    } catch {
      setProgramErr(t("adminProgramError"));
    } finally {
      setProgramBusy(null);
    }
  };

  const handlePreviewProgram = () => void runProgram(true);

  const handleSendProgram = () => {
    if (!globalThis.confirm(t("adminProgramSendConfirm"))) {
      return;
    }
    void runProgram(false);
  };

  const parseZipFilename = (header: string | null): string | null => {
    if (!header) {
      return null;
    }
    const utf8Match = /filename\*=(?:UTF-8''|utf-8'')([^;]+)/i.exec(header);
    if (utf8Match?.[1]) {
      try {
        return decodeURIComponent(utf8Match[1].trim().replace(/^"(.*)"$/, "$1"));
      } catch {
        return utf8Match[1].trim();
      }
    }
    const asciiMatch = /filename="([^"]+)"/i.exec(header);
    if (asciiMatch?.[1]) {
      return asciiMatch[1];
    }
    return null;
  };

  const handleCertificatesZip = async () => {
    if (!globalThis.confirm(t("adminCertificatesZipConfirm"))) {
      return;
    }
    setCertificatesErr(null);
    setCertificatesNotice(null);
    setReminderErr(null);
    setReminderNotice(null);
    setProgramErr(null);
    setProgramNotice(null);
    setCertificatesZipBusy(true);
    setCertificatesSendAllBusy(false);
    try {
      const { response, missingSession } = await fetchAsAdmin("/api/admin/certificates/generate", {
        method: "POST",
        body: JSON.stringify({})
      });
      if (missingSession || !response) {
        setCertificatesErr(t("adminCertificatesZipError"));
        return;
      }
      if (!response.ok) {
        try {
          const body = (await response.json()) as { error?: string };
          setCertificatesErr(body.error?.trim() || t("adminCertificatesZipError"));
        } catch {
          setCertificatesErr(t("adminCertificatesZipError"));
        }
        return;
      }
      const blob = await response.blob();
      const downloadName = parseZipFilename(response.headers.get("content-disposition")) ?? "conference-certificates.zip";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = downloadName;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setCertificatesNotice(t("adminCertificatesZipSuccess", { file: downloadName }));
    } catch {
      setCertificatesErr(t("adminCertificatesZipError"));
    } finally {
      setCertificatesZipBusy(false);
    }
  };

  const handleCertificatesSendAll = async () => {
    if (!globalThis.confirm(t("adminCertificatesSendAllConfirm"))) {
      return;
    }
    setCertificatesErr(null);
    setCertificatesNotice(null);
    setReminderErr(null);
    setReminderNotice(null);
    setProgramErr(null);
    setProgramNotice(null);
    setCertificatesSendAllBusy(true);
    setCertificatesZipBusy(false);
    try {
      const { response, missingSession } = await fetchAsAdmin("/api/admin/certificates/send-all", {
        method: "POST",
        body: JSON.stringify({})
      });
      if (missingSession || !response) {
        setCertificatesErr(t("adminCertificatesSendAllError"));
        return;
      }
      const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (!response.ok) {
        setCertificatesErr(typeof data?.error === "string" ? data.error : t("adminCertificatesSendAllError"));
        return;
      }
      const sent = typeof data?.sent === "number" ? data.sent : 0;
      const recipientCount = typeof data?.recipientCount === "number" ? data.recipientCount : 0;
      const skippedNoEmail = typeof data?.skippedNoEmail === "number" ? data.skippedNoEmail : 0;
      const failedCount = typeof data?.failedCount === "number" ? data.failedCount : 0;
      setCertificatesNotice(
        t("adminCertificatesSendAllSuccess", { sent, recipientCount, skippedNoEmail, failedCount })
      );
    } catch {
      setCertificatesErr(t("adminCertificatesSendAllError"));
    } finally {
      setCertificatesSendAllBusy(false);
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
              <div className="rounded-lg border border-sky-500/20 bg-sky-500/[0.07] p-4">
                <p className="text-sm text-slate-300">{t("adminConferenceMetaHint")}</p>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className={labelClass} htmlFor="cs-meta-title">
                      {t("adminConferenceFieldMetaTitle")}
                    </label>
                    <input
                      id="cs-meta-title"
                      type="text"
                      autoComplete="off"
                      value={metaTitle}
                      onChange={(e) => setMetaTitle(e.target.value)}
                      placeholder={t("adminConferenceFieldMetaTitlePlaceholder")}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="cs-meta-description">
                      {t("adminConferenceFieldMetaDescription")}
                    </label>
                    <textarea
                      id="cs-meta-description"
                      rows={3}
                      value={metaDescription}
                      onChange={(e) => setMetaDescription(e.target.value)}
                      placeholder={t("adminConferenceFieldMetaDescriptionPlaceholder")}
                      className={`${inputClass} min-h-[5rem]`}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="cs-hero-image-url">
                      {t("adminConferenceFieldHeroImageUrl")}
                    </label>
                    <p className="mt-1 text-xs text-slate-400">{t("adminConferenceFieldHeroImageUrlHint")}</p>
                    <input
                      id="cs-hero-image-url"
                      type="text"
                      inputMode="url"
                      autoComplete="off"
                      value={heroImageUrl}
                      onChange={(e) => setHeroImageUrl(e.target.value)}
                      placeholder={t("adminConferenceFieldHeroImageUrlPlaceholder")}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className={labelClass} htmlFor="cs-title-en">
                  {t("adminConferenceFieldTitleEn")}
                </label>
                <textarea
                  id="cs-title-en"
                  required
                  rows={3}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`${inputClass} min-h-[5rem]`}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="cs-title-ua">
                  {t("adminConferenceFieldTitleUa")}
                </label>
                <textarea
                  id="cs-title-ua"
                  rows={3}
                  value={titleUa}
                  onChange={(e) => setTitleUa(e.target.value)}
                  className={`${inputClass} min-h-[5rem]`}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="cs-hero-subtitle-en">
                  {t("adminConferenceFieldHeroSubtitleEn")}
                </label>
                <textarea
                  id="cs-hero-subtitle-en"
                  rows={2}
                  value={heroSubtitle}
                  onChange={(e) => setHeroSubtitle(e.target.value)}
                  className={`${inputClass} min-h-[4rem]`}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="cs-hero-subtitle-ua">
                  {t("adminConferenceFieldHeroSubtitleUa")}
                </label>
                <textarea
                  id="cs-hero-subtitle-ua"
                  rows={2}
                  value={heroSubtitleUa}
                  onChange={(e) => setHeroSubtitleUa(e.target.value)}
                  className={`${inputClass} min-h-[4rem]`}
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
                <label className={labelClass} htmlFor="cs-plenary-start">
                  {t("adminConferenceFieldPlenaryStartTime")}
                </label>
                <input
                  id="cs-plenary-start"
                  type="datetime-local"
                  value={plenaryStartLocal}
                  onChange={(e) => setPlenaryStartLocal(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="cs-description-en">
                  {t("adminConferenceFieldDescriptionEn")}
                </label>
                <textarea
                  id="cs-description-en"
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`${inputClass} min-h-[8rem]`}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="cs-description-ua">
                  {t("adminConferenceFieldDescriptionUa")}
                </label>
                <textarea
                  id="cs-description-ua"
                  rows={5}
                  value={descriptionUa}
                  onChange={(e) => setDescriptionUa(e.target.value)}
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
              <div className="rounded-lg border border-violet-500/20 bg-violet-500/[0.06] p-4">
                <p className="text-sm text-slate-300">{t("adminConferenceContactSocialHint")}</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} htmlFor="cs-support-phone">
                      {t("adminConferenceFieldSupportPhone")}
                    </label>
                    <input
                      id="cs-support-phone"
                      type="text"
                      autoComplete="off"
                      value={supportPhone}
                      onChange={(e) => setSupportPhone(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="cs-support-email">
                      {t("adminConferenceFieldSupportEmail")}
                    </label>
                    <input
                      id="cs-support-email"
                      type="email"
                      autoComplete="off"
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="cs-facebook-url">
                      {t("adminConferenceFieldFacebookUrl")}
                    </label>
                    <input
                      id="cs-facebook-url"
                      type="url"
                      inputMode="url"
                      autoComplete="off"
                      placeholder="https://facebook.com/..."
                      value={facebookUrl}
                      onChange={(e) => setFacebookUrl(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="cs-instagram-url">
                      {t("adminConferenceFieldInstagramUrl")}
                    </label>
                    <input
                      id="cs-instagram-url"
                      type="url"
                      inputMode="url"
                      autoComplete="off"
                      placeholder="https://instagram.com/..."
                      value={instagramUrl}
                      onChange={(e) => setInstagramUrl(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass} htmlFor="cs-telegram-url">
                      {t("adminConferenceFieldTelegramUrl")}
                    </label>
                    <input
                      id="cs-telegram-url"
                      type="url"
                      inputMode="url"
                      autoComplete="off"
                      placeholder="https://t.me/..."
                      value={telegramUrl}
                      onChange={(e) => setTelegramUrl(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
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
          <CardTitle className="text-2xl text-white">{t("adminReminderCardTitle")}</CardTitle>
          <CardDescription className="space-y-2 text-slate-300">
            <span className="block">{t("adminReminderCardSubtitle")}</span>
            <span className="block text-slate-400">{t("adminProgramCardSubtitle")}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {reminderErr && (
            <div className="rounded-md border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{reminderErr}</div>
          )}
          {programErr && (
            <div className="rounded-md border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{programErr}</div>
          )}
          {reminderNotice && (
            <div className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{reminderNotice}</div>
          )}
          {programNotice && (
            <div className="rounded-md border border-sky-400/40 bg-sky-500/10 px-4 py-3 text-sm text-sky-200">{programNotice}</div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-white/25 text-white hover:bg-white/10"
              disabled={!emailBatchIdle}
              onClick={handlePreviewReminder}
            >
              {reminderBusy === "preview" ? t("adminReminderPreviewing") : t("adminReminderPreview")}
            </Button>
            <Button type="button" disabled={!emailBatchIdle} onClick={handleSendReminder}>
              {reminderBusy === "send" ? t("adminReminderSending") : t("adminReminderSend")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-white/25 text-white hover:bg-white/10"
              disabled={!emailBatchIdle}
              onClick={handlePreviewProgram}
            >
              {programBusy === "preview" ? t("adminProgramPreviewing") : t("adminProgramPreview")}
            </Button>
            <Button type="button" disabled={!emailBatchIdle} onClick={handleSendProgram}>
              {programBusy === "send" ? t("adminProgramSending") : t("adminProgramSend")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-black/35 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl text-white">{t("adminCertificatesCardTitle")}</CardTitle>
          <CardDescription className="text-slate-300">{t("adminCertificatesCardSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {certificatesErr && (
            <div className="rounded-md border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{certificatesErr}</div>
          )}
          {certificatesNotice && (
            <div className="rounded-md border border-violet-400/40 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
              {certificatesNotice}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={!emailBatchIdle} onClick={() => void handleCertificatesZip()}>
              {certificatesZipBusy ? t("adminCertificatesGenerating") : t("adminCertificatesGenerateZip")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-white/25 text-white hover:bg-white/10"
              disabled={!emailBatchIdle}
              onClick={() => void handleCertificatesSendAll()}
            >
              {certificatesSendAllBusy ? t("adminCertificatesSendAllBusy") : t("adminCertificatesSendAll")}
            </Button>
          </div>
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
                  <div key={row.id} className="space-y-4 rounded-lg border border-white/15 bg-black/25 p-4">
                    <div className="grid gap-3 md:grid-cols-[1fr_1fr_6rem_auto] md:items-end">
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
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-rose-400/50 text-rose-200 hover:bg-rose-500/10"
                          disabled={busy}
                          onClick={() => void handleDeleteSection(row)}
                        >
                          {t("adminSectionsDelete")}
                        </Button>
                      </div>
                    </div>
                    <div className="border-t border-white/10 pt-4">
                      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">{t("adminSectionsZoomForSection")}</p>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="sm:col-span-2">
                          <label className={labelClass} htmlFor={`sec-zoom-link-${row.id}`}>
                            {t("adminConferenceFieldZoomLink")}
                          </label>
                          <input
                            id={`sec-zoom-link-${row.id}`}
                            type="text"
                            inputMode="url"
                            autoComplete="off"
                            placeholder="https://zoom.us/j/..."
                            value={row.zoom_link ?? ""}
                            onChange={(e) => updateSectionLocal(row.id, { zoom_link: e.target.value || null })}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass} htmlFor={`sec-zoom-id-${row.id}`}>
                            {t("adminSectionFieldZoomMeetingId")}
                          </label>
                          <input
                            id={`sec-zoom-id-${row.id}`}
                            type="text"
                            autoComplete="off"
                            value={row.zoom_meeting_id ?? ""}
                            onChange={(e) => updateSectionLocal(row.id, { zoom_meeting_id: e.target.value || null })}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass} htmlFor={`sec-zoom-pw-${row.id}`}>
                            {t("adminSectionFieldZoomPassword")}
                          </label>
                          <input
                            id={`sec-zoom-pw-${row.id}`}
                            type="text"
                            autoComplete="off"
                            value={row.zoom_password ?? ""}
                            onChange={(e) => updateSectionLocal(row.id, { zoom_password: e.target.value || null })}
                            className={inputClass}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className={labelClass} htmlFor={`sec-start-${row.id}`}>
                            {t("adminSectionFieldStartTime")}
                          </label>
                          <input
                            id={`sec-start-${row.id}`}
                            type="datetime-local"
                            value={isoToDatetimeLocalValue(row.start_time)}
                            onChange={(e) => updateSectionLocal(row.id, { start_time: datetimeLocalValueToIso(e.target.value) })}
                            className={inputClass}
                          />
                        </div>
                      </div>
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
