import { initDb } from '../db';
import type { Event } from './eventsRepo';

export type TicketStatus = 'KEEPING' | 'SELLING' | 'SOLD';

export type UserTicket = {
  id: string;
  userId: string;
  event: Event;
  section: string | null;
  row: string | null;
  seat: string | null;
  barcode: string | null;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
};

function newId() {
  return `ticket_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function parseGenres(raw: string | null) {
  if (!raw) return [];
  try {
    const x = JSON.parse(raw);
    return Array.isArray(x) ? x.map(String) : [];
  } catch {
    return [];
  }
}

function rowToTicket(r: any): UserTicket {
  return {
    id: r.ticket_id,
    userId: r.user_id,
    section: r.section,
    row: r.row,
    seat: r.seat,
    barcode: r.barcode,
    status: (r.status as TicketStatus) ?? 'KEEPING',
    createdAt: r.ticket_created_at,
    updatedAt: r.ticket_updated_at,
    event: {
      id: r.event_id,
      name: r.event_name,
      date: r.event_date,
      imageUrl: r.event_image_url,
      artist: {
        id: r.artist_id,
        name: r.artist_name,
        imageUrl: r.artist_image_url,
        genres: parseGenres(r.artist_genres),
      },
      venue: {
        id: r.venue_id,
        name: r.venue_name,
        city: r.venue_city,
        state: r.venue_state,
        country: r.venue_country,
        imageUrl: r.venue_image_url,
      },
    },
  };
}

export async function createTicket(params: {
  userId: string;
  eventId: string;
  section?: string | null;
  row?: string | null;
  seat?: string | null;
  barcode?: string | null;
  status?: TicketStatus;
}) {
  const db = await initDb();
  const now = new Date().toISOString();
  const id = newId();

  await db.runAsync(
    `INSERT INTO user_tickets (id, user_id, event_id, section, row, seat, barcode, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    params.userId,
    params.eventId,
    params.section ?? null,
    params.row ?? null,
    params.seat ?? null,
    params.barcode ?? null,
    params.status ?? 'KEEPING',
    now,
    now
  );

  return id;
}

export async function updateTicket(params: {
  id: string;
  section?: string | null;
  row?: string | null;
  seat?: string | null;
  barcode?: string | null;
  status?: TicketStatus;
}) {
  const db = await initDb();
  const now = new Date().toISOString();

  const fields: string[] = [];
  const values: any[] = [];

  if (params.section !== undefined) {
    fields.push('section = ?');
    values.push(params.section);
  }
  if (params.row !== undefined) {
    fields.push('row = ?');
    values.push(params.row);
  }
  if (params.seat !== undefined) {
    fields.push('seat = ?');
    values.push(params.seat);
  }
  if (params.barcode !== undefined) {
    fields.push('barcode = ?');
    values.push(params.barcode);
  }
  if (params.status !== undefined) {
    fields.push('status = ?');
    values.push(params.status);
  }

  fields.push('updated_at = ?');
  values.push(now);

  values.push(params.id);

  await db.runAsync(`UPDATE user_tickets SET ${fields.join(', ')} WHERE id = ?`, ...values);
}

export async function listTicketsForUser(userId: string): Promise<UserTicket[]> {
  const db = await initDb();
  const rows = await db.getAllAsync<any>(
    `
    SELECT
      t.id as ticket_id,
      t.user_id,
      t.section,
      t.row,
      t.seat,
      t.barcode,
      t.status,
      t.created_at as ticket_created_at,
      t.updated_at as ticket_updated_at,
      e.id as event_id,
      e.name as event_name,
      e.date as event_date,
      e.image_url as event_image_url,
      a.id as artist_id,
      a.name as artist_name,
      a.image_url as artist_image_url,
      a.genres as artist_genres,
      v.id as venue_id,
      v.name as venue_name,
      v.city as venue_city,
      v.state as venue_state,
      v.country as venue_country,
      v.image_url as venue_image_url
    FROM user_tickets t
    JOIN events e ON e.id = t.event_id
    JOIN artists a ON a.id = e.artist_id
    JOIN venues v ON v.id = e.venue_id
    WHERE t.user_id = ?
    ORDER BY e.date DESC
    LIMIT 200
    `,
    userId
  );

  return rows.map(rowToTicket);
}

export async function getTicketById(ticketId: string): Promise<UserTicket | null> {
  const db = await initDb();
  const r = await db.getFirstAsync<any>(
    `
    SELECT
      t.id as ticket_id,
      t.user_id,
      t.section,
      t.row,
      t.seat,
      t.barcode,
      t.status,
      t.created_at as ticket_created_at,
      t.updated_at as ticket_updated_at,
      e.id as event_id,
      e.name as event_name,
      e.date as event_date,
      e.image_url as event_image_url,
      a.id as artist_id,
      a.name as artist_name,
      a.image_url as artist_image_url,
      a.genres as artist_genres,
      v.id as venue_id,
      v.name as venue_name,
      v.city as venue_city,
      v.state as venue_state,
      v.country as venue_country,
      v.image_url as venue_image_url
    FROM user_tickets t
    JOIN events e ON e.id = t.event_id
    JOIN artists a ON a.id = e.artist_id
    JOIN venues v ON v.id = e.venue_id
    WHERE t.id = ?
    LIMIT 1
    `,
    ticketId
  );
  if (!r) return null;
  return rowToTicket(r);
}

export async function deleteTicket(ticketId: string) {
  const db = await initDb();
  await db.runAsync('DELETE FROM user_tickets WHERE id = ?', ticketId);
}

export async function listTicketsForUserEvent(userId: string, eventId: string): Promise<UserTicket[]> {
  const db = await initDb();
  const rows = await db.getAllAsync<any>(
    `
    SELECT
      t.id as ticket_id,
      t.user_id,
      t.section,
      t.row,
      t.seat,
      t.barcode,
      t.status,
      t.created_at as ticket_created_at,
      t.updated_at as ticket_updated_at,
      e.id as event_id,
      e.name as event_name,
      e.date as event_date,
      e.image_url as event_image_url,
      a.id as artist_id,
      a.name as artist_name,
      a.image_url as artist_image_url,
      a.genres as artist_genres,
      v.id as venue_id,
      v.name as venue_name,
      v.city as venue_city,
      v.state as venue_state,
      v.country as venue_country,
      v.image_url as venue_image_url
    FROM user_tickets t
    JOIN events e ON e.id = t.event_id
    JOIN artists a ON a.id = e.artist_id
    JOIN venues v ON v.id = e.venue_id
    WHERE t.user_id = ? AND t.event_id = ?
    ORDER BY t.created_at DESC
    LIMIT 20
    `,
    userId,
    eventId
  );

  return rows.map(rowToTicket);
}

export async function getTicketsForDate(userId: string, start: Date, end: Date): Promise<UserTicket[]> {
  const db = await initDb();
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const rows = await db.getAllAsync<any>(
    `
    SELECT
      t.id as ticket_id,
      t.user_id,
      t.section,
      t.row,
      t.seat,
      t.barcode,
      t.status,
      t.created_at as ticket_created_at,
      t.updated_at as ticket_updated_at,
      e.id as event_id,
      e.name as event_name,
      e.date as event_date,
      e.image_url as event_image_url,
      a.id as artist_id,
      a.name as artist_name,
      a.image_url as artist_image_url,
      a.genres as artist_genres,
      v.id as venue_id,
      v.name as venue_name,
      v.city as venue_city,
      v.state as venue_state,
      v.country as venue_country,
      v.image_url as venue_image_url
    FROM user_tickets t
    JOIN events e ON e.id = t.event_id
    JOIN artists a ON a.id = e.artist_id
    JOIN venues v ON v.id = e.venue_id
    WHERE t.user_id = ? AND e.date >= ? AND e.date < ?
    ORDER BY e.date ASC
    LIMIT 20
    `,
    userId,
    startIso,
    endIso
  );

  return rows.map(rowToTicket);
}




