import { useMemo } from 'react';

import { useAuthStore } from '../stores/authStore';
import type { QRCodeData } from '../types/friends';

export function useQRCode() {
  const user = useAuthStore((s) => s.user);

  const data = useMemo<QRCodeData | null>(() => {
    if (!user) return null;
    return { type: 'sticket_user', userId: user.id, username: user.username };
  }, [user]);

  const value = useMemo(() => (data ? JSON.stringify(data) : ''), [data]);

  const parse = (raw: string): QRCodeData | null => {
    try {
      const parsed = JSON.parse(raw) as QRCodeData;
      if (parsed?.type !== 'sticket_user') return null;
      if (!parsed.userId || !parsed.username) return null;
      return parsed;
    } catch {
      return null;
    }
  };

  return { data, value, parse };
}




