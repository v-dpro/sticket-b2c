import { useCallback, useEffect, useState } from 'react';

import { getNotificationPrefs, updateNotificationPrefs } from '../lib/api/notifications';
import type { NotificationPreferences } from '../types/notification';

const DEFAULT_PREFS: NotificationPreferences = {
  follows: true,
  comments: true,
  tags: true,
  wasThere: true,
  friendLogged: true,
  artistAnnouncements: true,
  ticketsOnSale: true,
  showReminders: true,
  postShowPrompts: true,
  pushEnabled: true,
  emailDigest: 'none',
};

export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getNotificationPrefs();
      setPrefs(data);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch notification preferences:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const updatePref = useCallback(
    async (key: keyof NotificationPreferences, value: NotificationPreferences[keyof NotificationPreferences]) => {
      const oldPrefs = { ...prefs };
      setPrefs((prev) => ({ ...prev, [key]: value }));
      setSaving(true);

      try {
        await updateNotificationPrefs({ [key]: value } as Partial<NotificationPreferences>);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to update notification preference:', error);
        setPrefs(oldPrefs);
      } finally {
        setSaving(false);
      }
    },
    [prefs]
  );

  return {
    prefs,
    loading,
    saving,
    updatePref,
    refresh: fetch,
  };
}



