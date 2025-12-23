import { useCallback, useEffect, useState } from 'react';

import { getPrivacySettings, updatePrivacySettings } from '../lib/api/settings';
import type { PrivacySettings } from '../types/settings';

const DEFAULT_PRIVACY: PrivacySettings = {
  profileVisibility: 'public',
  activityVisibility: 'friends',
  showInSuggestions: true,
  allowTagging: true,
};

export function usePrivacySettings() {
  const [privacy, setPrivacy] = useState<PrivacySettings>(DEFAULT_PRIVACY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPrivacySettings();
      setPrivacy(data);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch privacy settings:', err);
      setError(err?.message || 'Failed to load privacy settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const update = async <K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]) => {
    const old = { ...privacy };
    setPrivacy((p) => ({ ...p, [key]: value }));
    setSaving(true);
    try {
      const updated = await updatePrivacySettings({ [key]: value } as Partial<PrivacySettings>);
      setPrivacy(updated);
    } catch (err) {
      setPrivacy(old);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return { privacy, loading, saving, error, refresh: fetch, update };
}



