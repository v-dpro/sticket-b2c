import { useEffect, useState } from 'react';

import { useSession } from './useSession';
import { getTicketsForDate } from '../lib/local/repo/ticketsRepo';

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

    getTicketsForDate(user.id, today, tomorrow)
      .then((tickets) => {
        if (tickets.length > 0) {
          const ticket = tickets[0];
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



