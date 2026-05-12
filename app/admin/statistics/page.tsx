"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sectionLabel, type ConferenceSectionRow } from "@/lib/conference-sections";
import "@/lib/i18n/config";
import { supabase } from "@/lib/supabase";

const PIE_COLORS = ["#38bdf8", "#a78bfa", "#fbbf24", "#34d399", "#fb7185", "#94a3b8"];

type SubmissionRecord = {
  user_id: string;
  thematic_panel: string | null;
  section_id: string | null;
  status: string | null;
};

type StatusBucket = "pending" | "under_review" | "needs_revision" | "accepted" | "rejected" | "other";

function statusBucket(raw: string | null): StatusBucket {
  const s = raw?.trim() ?? "";
  if (s === "pending") return "pending";
  if (s === "pending_review" || s === "under_review") return "under_review";
  if (s === "needs_revision") return "needs_revision";
  if (s === "accepted") return "accepted";
  if (s === "rejected") return "rejected";
  return "other";
}

const tooltipProps = {
  contentStyle: {
    backgroundColor: "rgba(15, 23, 42, 0.96)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "8px",
    color: "#e2e8f0"
  },
  labelStyle: { color: "#e2e8f0" }
} as const;

export default function AdminStatisticsPage() {
  const { t, i18n } = useTranslation();
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [sections, setSections] = useState<ConferenceSectionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAsAdmin = useCallback(async (input: string, init?: RequestInit) => {
    const {
      data: { session }
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return { response: null as Response | null, missingSession: true as const };
    }
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${session.access_token}`);
    const response = await fetch(input, { ...init, headers });
    return { response, missingSession: false as const };
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      const { response, missingSession } = await fetchAsAdmin("/api/admin/submissions");
      if (missingSession || !response) {
        setError(t("adminLoadError"));
        setLoading(false);
        return;
      }
      if (response.status === 401 || response.status === 403) {
        setError(t("adminAccessDenied"));
        setLoading(false);
        return;
      }
      if (!response.ok) {
        setError(t("adminLoadError"));
        setLoading(false);
        return;
      }
      const payload = (await response.json()) as { submissions: SubmissionRecord[] };
      setSubmissions(payload.submissions ?? []);
      setLoading(false);
    };
    void load();
  }, [fetchAsAdmin, t]);

  useEffect(() => {
    const loadSections = async () => {
      try {
        const res = await fetch("/api/conference-sections", { cache: "no-store" });
        const json = (await res.json()) as { sections?: ConferenceSectionRow[] };
        setSections(json.sections ?? []);
      } catch {
        setSections([]);
      }
    };
    void loadSections();
  }, []);

  const totalSubmissions = submissions.length;
  const uniqueParticipants = useMemo(() => new Set(submissions.map((s) => s.user_id).filter(Boolean)).size, [submissions]);

  const sectionChartData = useMemo(() => {
    const slugToId = new Map<string, string>();
    for (const sec of sections) {
      if (sec.slug) {
        slugToId.set(sec.slug.trim(), sec.id);
      }
    }
    const bucketKey = (s: SubmissionRecord): string => {
      const sid = s.section_id?.trim();
      if (sid) {
        return sid;
      }
      const tp = s.thematic_panel?.trim() ?? "";
      return slugToId.get(tp) ?? "__other__";
    };
    const counts = new Map<string, number>();
    for (const s of submissions) {
      const k = bucketKey(s);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const rows: { name: string; count: number }[] = sections.map((sec) => ({
      name: sectionLabel(sec, i18n.language),
      count: counts.get(sec.id) ?? 0
    }));
    const other = counts.get("__other__") ?? 0;
    if (other > 0) {
      rows.push({ name: t("adminStatsSectionOther"), count: other });
    }
    return rows;
  }, [submissions, sections, i18n.language, t]);

  const statusChartData = useMemo(() => {
    const counts = new Map<StatusBucket, number>();
    for (const s of submissions) {
      const b = statusBucket(s.status);
      counts.set(b, (counts.get(b) ?? 0) + 1);
    }
    const order: StatusBucket[] = ["pending", "under_review", "needs_revision", "accepted", "rejected", "other"];
    const labelFor = (b: StatusBucket) => {
      switch (b) {
        case "pending":
          return t("adminStatsStatusPending");
        case "under_review":
          return t("adminStatsStatusUnderReview");
        case "needs_revision":
          return t("adminStatusNeedsRevision");
        case "accepted":
          return t("adminStatusAccepted");
        case "rejected":
          return t("adminStatusRejected");
        default:
          return t("adminStatusUnknown");
      }
    };
    return order
      .map((b) => ({ name: labelFor(b), value: counts.get(b) ?? 0, key: b }))
      .filter((row) => row.value > 0);
  }, [submissions, t]);

  return (
    <Card className="border-white/10 bg-black/35 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-2xl text-white">{t("adminStatsTitle")}</CardTitle>
        <CardDescription className="text-slate-300">{t("adminStatsSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {error && (
          <div className="rounded-md border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>
        )}

        {loading && <p className="text-slate-300">{t("adminStatsLoading")}</p>}

        {!loading && !error && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-white/15 bg-white/5 p-5">
                <p className="text-sm font-medium text-slate-400">{t("adminStatsTotalSubmissions")}</p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-white">{totalSubmissions}</p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/5 p-5">
                <p className="text-sm font-medium text-slate-400">{t("adminStatsUniqueParticipants")}</p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-white">{uniqueParticipants}</p>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-lg font-semibold text-white">{t("adminStatsBySection")}</h3>
              <div className="h-[320px] w-full min-w-0 rounded-lg border border-white/10 bg-black/20 p-2">
                {sectionChartData.some((d) => d.count > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sectionChartData} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                      <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} interval={0} angle={-28} textAnchor="end" height={60} />
                      <YAxis tick={{ fill: "#94a3b8" }} allowDecimals={false} />
                      <Tooltip {...tooltipProps} />
                      <Bar dataKey="count" name={t("adminStatsTotalSubmissions")} fill="#38bdf8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="flex h-full items-center justify-center text-sm text-slate-400">{t("adminNoSubmissions")}</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-lg font-semibold text-white">{t("adminStatsByStatus")}</h3>
              <div className="h-[360px] w-full min-w-0 rounded-lg border border-white/10 bg-black/20 p-2">
                {statusChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={110}
                        paddingAngle={2}
                        label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                      >
                        {statusChartData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="rgba(15,23,42,0.8)" strokeWidth={1} />
                        ))}
                      </Pie>
                      <Tooltip {...tooltipProps} />
                      <Legend
                        wrapperStyle={{ color: "#cbd5e1", fontSize: "12px" }}
                        formatter={(value) => <span className="text-slate-300">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="flex h-full items-center justify-center text-sm text-slate-400">{t("adminNoSubmissions")}</p>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
