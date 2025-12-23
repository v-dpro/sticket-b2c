import { useCallback, useEffect, useState } from 'react';

import { getTicket } from '../lib/api/tickets';
import type { Ticket } from '../types/ticket';

export function useTicketDetail(ticketId: string) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!ticketId) {
      setTicket(null);
      setLoading(false);
      setError('Missing ticket id');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getTicket(ticketId);
      setTicket(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load ticket');
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    ticket,
    loading,
    error,
    refetch: fetch,
  };
}



