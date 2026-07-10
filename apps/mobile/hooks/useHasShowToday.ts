import { useEffect, useState } from 'react';

import { useSession } from './useSession';
import { getTickets } from '../lib/api/tickets';

type TodayTicket = {
  id: string;
  eventId: string;
  artistName: string;
  venueName: string;
} | null;

export function useHasShowToday() {
  const { user } = useSession();
  const [hasShowToday, setHasShowToday] = useState(false);
  const [todayTicket, setTodayTicket] = useState<TodayTicket>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setHasShowToday(false);
      setTodayTicket(null);
      setLoading(false);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    getTickets({ upcoming: true })
      .then((tickets) => {
        const todays = tickets.filter((t) => {
          const d = new Date(t.event?.date ?? '');
          return !Number.isNaN(d.getTime()) && d >= today && d < tomorrow;
        });

        if (todays.length > 0) {
          const ticket = todays[0];
          setHasShowToday(true);
          setTodayTicket({
            id: ticket.id,
            eventId: ticket.event?.id ?? '',
            artistName: ticket.event?.artist?.name ?? 'Show',
            venueName: ticket.event?.venue?.name ?? '',
          });
        } else {
          setHasShowToday(false);
          setTodayTicket(null);
        }
      })
      .catch(() => {
        setHasShowToday(false);
        setTodayTicket(null);
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  return { hasShowToday, todayTicket, loading };
}
