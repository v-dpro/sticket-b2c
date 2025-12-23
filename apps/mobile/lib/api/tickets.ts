import { apiClient } from './client';
import type { Ticket, AddTicketData, TicketStatus } from '../../types/ticket';

// Get all user's tickets
export async function getTickets(options?: {
  upcoming?: boolean;
  past?: boolean;
  status?: TicketStatus;
}): Promise<Ticket[]> {
  const response = await apiClient.get('/tickets', { params: options });
  return response.data;
}

// Get single ticket
export async function getTicket(ticketId: string): Promise<Ticket> {
  const response = await apiClient.get(`/tickets/${ticketId}`);
  return response.data;
}

// Add ticket manually
export async function addTicket(data: AddTicketData): Promise<Ticket> {
  const response = await apiClient.post('/tickets', data);
  return response.data;
}

// Update ticket
export async function updateTicket(
  ticketId: string,
  data: Partial<AddTicketData & { status: TicketStatus }>
): Promise<Ticket> {
  const response = await apiClient.patch(`/tickets/${ticketId}`, data);
  return response.data;
}

// Delete ticket
export async function deleteTicket(ticketId: string): Promise<void> {
  await apiClient.delete(`/tickets/${ticketId}`);
}

// Mark ticket for sale (Phase 2 prep)
export async function markForSale(ticketId: string, askingPrice: number): Promise<Ticket> {
  const response = await apiClient.post(`/tickets/${ticketId}/sell`, {
    askingPrice,
  });
  return response.data;
}

// Cancel sale listing
export async function cancelSale(ticketId: string): Promise<Ticket> {
  const response = await apiClient.delete(`/tickets/${ticketId}/sell`);
  return response.data;
}

// Search events for ticket entry
export async function searchEventsForTicket(
  query: string
): Promise<
  Array<{
    id: string;
    name: string;
    date: string;
    artist: { id: string; name: string };
    venue: { id: string; name: string; city: string };
  }>
> {
  const response = await apiClient.get('/events/search', {
    params: { q: query, upcoming: true, limit: 10 },
  });
  return response.data;
}



