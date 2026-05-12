"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import "@/lib/i18n/config";
import { supabase } from "@/lib/supabase";

type AdminUserRow = {
  id: string;
  email: string;
  createdAt: string;
  fullName: string;
  role: "user" | "admin";
  effectiveRole: "user" | "admin";
  isBootstrapAdmin: boolean;
};

export default function AdminUsersPage() {
  const { t, i18n } = useTranslation();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

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

  const loadUsers = useCallback(
    async (opts?: { silent?: boolean }) => {
      setError(null);
      if (!opts?.silent) {
        setLoading(true);
      }
      const { response, missingSession } = await fetchAsAdmin("/api/admin/users");
      if (missingSession || !response) {
        setError(t("adminUsersLoadError"));
        if (!opts?.silent) {
          setLoading(false);
        }
        return;
      }
      if (!response.ok) {
        setError(t("adminUsersLoadError"));
        if (!opts?.silent) {
          setLoading(false);
        }
        return;
      }
      const json = (await response.json()) as { users: AdminUserRow[] };
      setUsers(json.users ?? []);
      if (!opts?.silent) {
        setLoading(false);
      }
    },
    [fetchAsAdmin, t]
  );

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const formatDate = (iso: string) => {
    if (!iso) return "—";
    const locale = i18n.language === "ua" ? "uk-UA" : "en-US";
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(iso));
  };

  const handleRoleChange = async (row: AdminUserRow, nextRole: "user" | "admin") => {
    if (row.isBootstrapAdmin && nextRole === "user") {
      return;
    }
    if (row.role === nextRole && !row.isBootstrapAdmin) {
      return;
    }
    if (row.isBootstrapAdmin) {
      return;
    }

    setError(null);
    setSavingId(row.id);
    try {
      const { response, missingSession } = await fetchAsAdmin(`/api/admin/users/${encodeURIComponent(row.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ role: nextRole })
      });
      if (missingSession || !response?.ok) {
        const body = response ? ((await response.json().catch(() => null)) as { error?: string } | null) : null;
        setError(body?.error?.trim() || t("adminUsersRoleUpdateError"));
        setSavingId(null);
        return;
      }
      await loadUsers({ silent: true });
    } catch {
      setError(t("adminUsersRoleUpdateError"));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Card className="border-white/10 bg-black/35 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-2xl text-white">{t("adminUsersTitle")}</CardTitle>
        <CardDescription className="text-slate-300">{t("adminUsersSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-md border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>
        )}

        {loading && <p className="text-slate-300">{t("adminUsersLoading")}</p>}

        {!loading && users.length === 0 && <p className="text-slate-300">{t("adminUsersEmpty")}</p>}

        {!loading && users.length > 0 && (
          <div className="overflow-x-auto rounded-md border border-white/15">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-200">{t("adminUsersName")}</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-200">{t("adminUsersEmail")}</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-200">{t("adminUsersRegistered")}</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-200">{t("adminUsersRole")}</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-200">{t("adminUsersRoleControl")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-black/20">
                {users.map((row) => {
                  const isSaving = savingId === row.id;
                  const disabled = row.isBootstrapAdmin || isSaving;
                  const displayRoleLabel =
                    row.effectiveRole === "admin" ? t("adminRoleAdmin") : t("adminRoleUser");
                  return (
                    <tr key={row.id}>
                      <td className="max-w-[12rem] px-4 py-3 text-slate-200">{row.fullName}</td>
                      <td className="max-w-[14rem] px-4 py-3 text-slate-200">{row.email}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-200">{formatDate(row.createdAt)}</td>
                      <td className="px-4 py-3 text-slate-200">
                        <span className="inline-flex flex-col gap-1">
                          <span>{displayRoleLabel}</span>
                          {row.isBootstrapAdmin && (
                            <span className="text-xs text-amber-200/90">{t("adminUsersBootstrapHint")}</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <select
                          value={row.isBootstrapAdmin ? "admin" : row.role}
                          disabled={disabled}
                          onChange={(e) => void handleRoleChange(row, e.target.value as "user" | "admin")}
                          className="h-9 min-w-[8rem] rounded-md border border-white/20 bg-white/5 px-2 text-xs text-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label={t("adminUsersRoleControl")}
                        >
                          <option value="user" className="bg-slate-900">
                            {t("adminRoleUser")}
                          </option>
                          <option value="admin" className="bg-slate-900">
                            {t("adminRoleAdmin")}
                          </option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
