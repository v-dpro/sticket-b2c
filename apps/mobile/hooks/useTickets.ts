import { useCallback, useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';

import { getTickets } from '../lib/api/tickets';
import type { Ticket, TicketGroup, TicketStatus } from '../types/ticket';

function groupTicketsByMonth(tickets: Ticket[]): TicketGroup[] {
  const groups: Map<string, Ticket[]> = new Map();

  for (const ticket of tickets) {
    const date = parseISO(ticket.event.date);
    const label = format(date, 'MMMM yyyy');

    const existing = groups.get(label) || [];
    groups.set(label, [...existing, ticket]);
  }

  return Array.from(groups.entries()).map(([date, groupedTickets]) => ({
    date,
    tickets: groupedTickets.sort(
      (a, b) => new Date(a.event.date).getTime() - new Date(b.event.date).getTime()
    ),
  }));
}

export function useTickets(options?: { status?: TicketStatus }) {
  const [upcomingTickets, setUpcomingTickets] = useState<Ticket[]>([]);
  const [pastTickets, setPastTickets] = useState<Ticket[]>([]);
  const [upcomingGroups, setUpcomingGroups] = useState<TicketGroup[]>([]);
  const [pastGroups, setPastGroups] = useState<TicketGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const [upcoming, past] = await Promise.all([
          getTickets({ upcoming: true, status: options?.status }),
          getTickets({ past: true, status: options?.status }),
        ]);

        setUpcomingTickets(upcoming);
        setPastTickets(past);
        setUpcomingGroups(groupTicketsByMonth(upcoming));
        setPastGroups(groupTicketsByMonth(past));
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Failed to load tickets');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [options?.status]
  );

  useEffect(() => {
    fetch();
  }, [fetch]);

  const removeTicket = (ticketId: string) => {
    setUpcomingTickets((prev) => prev.filter((t) => t.id !== ticketId));
    setPastTickets((prev) => prev.filter((t) => t.id !== ticketId));

    setUpcomingGroups((prev) =>
      prev
        .map((g) => ({ ...g, tickets: g.tickets.filter((t) => t.id !== ticketId) }))
        .filter((g) => g.tickets.length > 0)
    );

    setPastGroups((prev) =>
      prev
        .map((g) => ({ ...g, tickets: g.tickets.filter((t) => t.id !== ticketId) }))
        .filter((g) => g.tickets.length > 0)
    );
  };

  const updateTicketStatus = (ticketId: string, status: TicketStatus) => {
    const updateFn = (tickets: Ticket[]) =>
      tickets.map((t) => (t.id === ticketId ? { ...t, status } : t));

    setUpcomingTickets(updateFn);
    setPastTickets(updateFn);
  };

  return {
    upcomingTickets,
    pastTickets,
    upcomingGroups,
    pastGroups,
    loading,
    refreshing,
    error,
    refresh: () => fetch(true),
    removeTicket,
    updateTicketStatus,
  };
}



