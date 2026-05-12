"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { DEFAULT_CONFERENCE_SETTINGS, type ConferenceSettingsRow } from "@/lib/conference-settings";

type ConferenceSettingsContextValue = {
  settings: ConferenceSettingsRow;
  loading: boolean;
};

const ConferenceSettingsContext = createContext<ConferenceSettingsContextValue | null>(null);

export function ConferenceSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ConferenceSettingsRow>({
    ...DEFAULT_CONFERENCE_SETTINGS,
    updated_at: new Date().toISOString()
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/conference-settings");
        const json = (await res.json()) as { settings?: ConferenceSettingsRow };
        if (!cancelled && json.settings) {
          setSettings(json.settings);
        }
      } catch {
        /* keep defaults */
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => ({ settings, loading }), [settings, loading]);

  return <ConferenceSettingsContext.Provider value={value}>{children}</ConferenceSettingsContext.Provider>;
}

export function useConferenceSettings(): ConferenceSettingsContextValue {
  const ctx = useContext(ConferenceSettingsContext);
  if (!ctx) {
    return {
      settings: { ...DEFAULT_CONFERENCE_SETTINGS, updated_at: new Date().toISOString() },
      loading: false
    };
  }
  return ctx;
}
