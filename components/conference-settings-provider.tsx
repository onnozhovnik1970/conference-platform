"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { DEFAULT_CONFERENCE_SETTINGS, type ConferenceSettingsRow } from "@/lib/conference-settings";

type ConferenceSettingsContextValue = {
  settings: ConferenceSettingsRow;
  loading: boolean;
  /** Refetch from the server (no cache). Call after saving in admin so the site updates immediately. */
  refresh: () => Promise<void>;
};

const ConferenceSettingsContext = createContext<ConferenceSettingsContextValue | null>(null);

const PUBLIC_SETTINGS_FETCH: RequestInit = {
  cache: "no-store"
};

export function ConferenceSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ConferenceSettingsRow>({
    ...DEFAULT_CONFERENCE_SETTINGS,
    updated_at: new Date().toISOString()
  });
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadSettings = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true);
    }
    try {
      const res = await fetch("/api/conference-settings", PUBLIC_SETTINGS_FETCH);
      const json = (await res.json()) as { settings?: ConferenceSettingsRow };
      if (mountedRef.current && json.settings) {
        setSettings(json.settings);
      }
    } catch {
      /* keep previous settings */
    } finally {
      if (mountedRef.current && !opts?.silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const refresh = useCallback(async () => {
    await loadSettings({ silent: true });
  }, [loadSettings]);

  const value = useMemo(
    () => ({
      settings,
      loading,
      refresh
    }),
    [settings, loading, refresh]
  );

  return <ConferenceSettingsContext.Provider value={value}>{children}</ConferenceSettingsContext.Provider>;
}

export function useConferenceSettings(): ConferenceSettingsContextValue {
  const ctx = useContext(ConferenceSettingsContext);
  if (!ctx) {
    return {
      settings: { ...DEFAULT_CONFERENCE_SETTINGS, updated_at: new Date().toISOString() },
      loading: false,
      refresh: async () => {}
    };
  }
  return ctx;
}
