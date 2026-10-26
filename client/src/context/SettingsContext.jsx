import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "./AuthContext";

// Group-wide switches (SOLD tags, golden frame, ratings, leaderboards,
// RTM). Defaults are all-on so the UI is complete before the fetch lands.
const DEFAULTS = {
  soldTags: true,
  goldenFrame: true,
  ratings: true,
  leaderboards: true,
  rtm: true,
};

const SettingsContext = createContext({ settings: DEFAULTS, update: async () => {} });

export function SettingsProvider({ children }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState(DEFAULTS);

  useEffect(() => {
    if (!user) return;
    api
      .getSettings()
      .then(({ settings }) => setSettings({ ...DEFAULTS, ...settings }))
      .catch(() => {});
  }, [user]);

  const update = async (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next); // optimistic — switches feel instant
    try {
      const { settings: saved } = await api.updateSettings(patch);
      setSettings({ ...DEFAULTS, ...saved });
    } catch {
      // Keep the optimistic value; the next full load will reconcile.
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, update }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
