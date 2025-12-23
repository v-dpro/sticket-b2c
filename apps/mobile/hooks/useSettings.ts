import { useCallback, useEffect, useState } from 'react';

import { getSettings, updateSettings } from '../lib/api/settings';
import type { UserSettings } from '../types/settings';

const DEFAULT_SETTINGS: UserSettings = {
  profileVisibility: 'public',
  activityVisibility: 'friends',
  showInSuggestions: true,
  allowTagging: true,
  distanceUnit: 'miles',
  spotifyConnected: false,
  appleMusicConnected: false,
};

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getSettings();
      setSettings(data);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch settings:', err);
      setError(err?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const updateSetting = async <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    const oldSettings = { ...settings };

    // Optimistic update
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaving(true);

    try {
      const updated = await updateSettings({ [key]: value } as Partial<UserSettings>);
      // Ensure we normalize to what the server persisted (e.g. trimming / nulls).
      setSettings(updated);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to update setting:', err);
      // Rollback
      setSettings(oldSettings);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return {
    settings,
    loading,
    saving,
    error,
    refresh: fetch,
    updateSetting,
  };
}



