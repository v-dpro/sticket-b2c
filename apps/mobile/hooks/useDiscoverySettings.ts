import { useCallback, useEffect, useState } from 'react';

import { getMyDiscoverySettings, updateDiscoverySettings } from '../lib/api/users';
import { haptics } from '../lib/motion';
import type { DiscoverySettings } from '../types/settings';

const DEFAULT_DISCOVERY: DiscoverySettings = {
  sameShowRadius: 'OFF',
  tasteRadius: 'OFF',
  showInGalleries: false,
};

/** DISCOVERY DIALS — hydrates from GET /auth/me, writes via PATCH /users/me/discovery. */
export function useDiscoverySettings() {
  const [settings, setSettings] = useState<DiscoverySettings>(DEFAULT_DISCOVERY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyDiscoverySettings();
      setSettings(data);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch discovery settings:', err);
      setError(err?.message || 'Failed to load discovery settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const update = async <K extends keyof DiscoverySettings>(key: K, value: DiscoverySettings[K]) => {
    const previous = settings[key];

    // Optimistic update.
    setSettings((s) => ({ ...s, [key]: value }));
    setSaving(true);

    try {
      const patch = await updateDiscoverySettings({ [key]: value } as Partial<DiscoverySettings>);
      // Merge whatever the server echoes back; keep the optimistic value for
      // anything it doesn't report.
      setSettings((s) => ({ ...s, ...patch }));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to update discovery setting:', err);
      // Revert.
      setSettings((s) => ({ ...s, [key]: previous }));
      haptics.error();
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
    update,
  };
}
