import { useState } from 'react';

import { promoteInterestedToGoing } from '../lib/api/events';
import { addTicket, searchEventsForTicket } from '../lib/api/tickets';
import type { AddTicketData, Ticket } from '../types/ticket';

export function useAddTicket() {
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const searchEvents = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await searchEventsForTicket(query);
      setSearchResults(results);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Event search failed:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const submitTicket = async (data: AddTicketData): Promise<Ticket | null> => {
    setLoading(true);
    try {
      const ticket = await addTicket(data);
      // A18: a ticket means you're going — silently clear any "interested" mark.
      if (ticket?.event?.id) void promoteInterestedToGoing(ticket.event.id);
      return ticket;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to add ticket:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    searchResults,
    searching,
    searchEvents,
    submitTicket,
    clearSearch: () => setSearchResults([]),
  };
}



