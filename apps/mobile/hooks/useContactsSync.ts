import { useCallback, useState } from 'react';
import * as Contacts from 'expo-contacts';

import { syncContacts } from '../lib/api/friends';
import type { ContactMatch } from '../types/friends';

type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export function useContactsSync() {
  const [matches, setMatches] = useState<ContactMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('undetermined');

  const requestPermission = async (): Promise<boolean> => {
    const { status } = await Contacts.requestPermissionsAsync();
    setPermissionStatus(status === 'granted' ? 'granted' : 'denied');
    return status === 'granted';
  };

  const sync = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { status } = await Contacts.getPermissionsAsync();
      if (status !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          setError('Contacts permission denied');
          return;
        }
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
      });

      const payload = data
        .map((c) => {
          const name = c.name || 'Unknown';
          const phoneNumber = c.phoneNumbers?.[0]?.number || undefined;
          const email = c.emails?.[0]?.email || undefined;
          if (!phoneNumber && !email) return null;
          return { name, phoneNumber, email };
        })
        .filter(Boolean) as { name: string; phoneNumber?: string; email?: string }[];

      if (payload.length === 0) {
        setMatches([]);
        return;
      }

      const matchedUsers = await syncContacts(payload);
      setMatches(matchedUsers);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Contacts sync failed:', err);
      setError(err?.message || 'Failed to sync contacts');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateFollowStatus = (userId: string, isFollowing: boolean) => {
    setMatches((prev) => prev.map((match) => (match.id === userId ? { ...match, isFollowing } : match)));
  };

  return {
    matches,
    loading,
    error,
    permissionStatus,
    sync,
    requestPermission,
    updateFollowStatus,
  };
}




