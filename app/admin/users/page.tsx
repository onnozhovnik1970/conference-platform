"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import "@/lib/i18n/config";
import { supabase } from "@/lib/supabase";

type AdminUserRow = {
  id: string;
  email: string;
  createdAt: string;
  fullName: string;
  firstName: string;
  lastName: string;
  middleName: string;
  institution: string;
  role: "user" | "admin";
  effectiveRole: "user" | "admin";
  isBootstrapAdmin: boolean;
};

type ProfileDraft = {
  firstName: string;
  lastName: string;
  middleName: string;
  institution: string;
};

const emptyDraft: ProfileDraft = {
  firstName: "",
  lastName: "",
  middleName: "",
  institution: ""
};

export default function AdminUsersPage() {
  const { t, i18n } = useTranslation();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminUserRow | null>(null);
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft);

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
      const listUrl = `/api/admin/users?_=${Date.now()}`;
      const { response, missingSession } = await fetchAsAdmin(listUrl);
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
      const rows = json.users ?? [];
      setUsers(rows.map((u) => ({ ...u })));
      if (!opts?.silent) {
        setLoading(false);
      }
    },
    [fetchAsAdmin, t]
  );

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (!editing) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditing(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing]);

  const formatDate = (iso: string) => {
    if (!iso) return "—";
    const locale = i18n.language === "ua" ? "uk-UA" : "en-US";
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(iso));
  };

  const openEdit = (row: AdminUserRow) => {
    setError(null);
    setEditing(row);
    const nextDraft: ProfileDraft = {
      firstName: row.firstName,
      lastName: row.lastName,
      middleName: row.middleName,
      institution: row.institution
    };
    setDraft(nextDraft);
    console.log("Edit opened", nextDraft);
  };

  const closeEdit = () => {
    setEditing(null);
    setDraft(emptyDraft);
  };

  const handleSaveProfile = async () => {
    if (!editing) {
      return;
    }
    setError(null);
    setSavingId(editing.id);
    try {
      const patchUrl = `/api/admin/users/${encodeURIComponent(editing.id)}`;
      const patchBody = {
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        middleName: draft.middleName.trim() || null,
        institution: draft.institution.trim()
      };
      // DevTools: Network → PATCH …/api/admin/users/[id] — compare with console output below.
      console.log("[admin users] PATCH request", { url: patchUrl, body: patchBody });

      const { response, missingSession } = await fetchAsAdmin(patchUrl, {
        method: "PATCH",
        body: JSON.stringify(patchBody)
      });
      if (missingSession || !response) {
        console.log("[admin users] PATCH response (no response)", { missingSession });
        setError(t("adminUsersProfileUpdateError"));
        return;
      }

      const data = (await response.json().catch(() => ({}))) as { error?: string; success?: boolean };
      console.log("[admin users] PATCH response", response.status, data);

      if (!response.ok) {
        setError(data.error ?? "Failed to save");
        return;
      }
      if (data.success === false) {
        setError(data.error?.trim() || t("adminUsersProfileUpdateError"));
        return;
      }
      closeEdit();
      await loadUsers({ silent: true });
    } catch (e) {
      console.error("[admin users] PATCH failed", e);
      setError(t("adminUsersProfileUpdateError"));
    } finally {
      setSavingId(null);
    }
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

  const inputClass =
    "mt-1 h-10 w-full rounded-md border border-white/20 bg-white/5 px-3 text-sm text-white placeholder:text-slate-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40";
  const labelClass = "block text-xs font-medium text-slate-300";

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
                  <th className="px-4 py-3 text-left font-medium text-slate-200">{t("adminUsersActions")}</th>
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
                      <td className="px-4 py-3 align-top">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isSaving}
                          className="border-white/25 bg-white/5 text-white hover:bg-white/10"
                          onClick={() => openEdit(row)}
                        >
                          {t("adminUsersEdit")}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {editing && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            role="presentation"
            onClick={closeEdit}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-user-edit-title"
              className="w-full max-w-md rounded-lg border border-white/20 bg-slate-900 p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <form
                className="block"
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void handleSaveProfile();
                }}
              >
                <h2 id="admin-user-edit-title" className="text-lg font-semibold text-white">
                  {t("adminUsersEditTitle")}
                </h2>
                <p className="mt-1 text-xs text-slate-400">{editing.email}</p>

                <div className="mt-5 space-y-3">
                  <div>
                    <label className={labelClass} htmlFor="admin-edit-last">
                      {t("adminUsersLastName")}
                    </label>
                    <input
                      id="admin-edit-last"
                      className={inputClass}
                      value={draft.lastName}
                      onChange={(e) => setDraft((d) => ({ ...d, lastName: e.target.value }))}
                      autoComplete="family-name"
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="admin-edit-first">
                      {t("adminUsersFirstName")}
                    </label>
                    <input
                      id="admin-edit-first"
                      className={inputClass}
                      value={draft.firstName}
                      onChange={(e) => setDraft((d) => ({ ...d, firstName: e.target.value }))}
                      autoComplete="given-name"
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="admin-edit-middle">
                      {t("adminUsersPatronymic")}
                    </label>
                    <input
                      id="admin-edit-middle"
                      className={inputClass}
                      value={draft.middleName}
                      onChange={(e) => setDraft((d) => ({ ...d, middleName: e.target.value }))}
                      autoComplete="additional-name"
                    />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="admin-edit-inst">
                      {t("adminUsersInstitution")}
                    </label>
                    <input
                      id="admin-edit-inst"
                      className={inputClass}
                      value={draft.institution}
                      onChange={(e) => setDraft((d) => ({ ...d, institution: e.target.value }))}
                      autoComplete="organization"
                    />
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="outline" className="border-white/25 text-white" onClick={closeEdit}>
                    {t("adminUsersCancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={savingId === editing.id}
                    onClick={() => console.log("Save clicked", draft)}
                  >
                    {t("adminUsersSave")}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
