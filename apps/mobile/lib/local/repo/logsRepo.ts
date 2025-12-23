import { initDb } from '../db';
import type { Event } from './eventsRepo';

export type UserLog = {
  id: string;
  userId: string;
  event: Event;
  rating: number | null;
  note: string | null;
  section: string | null;
  row: string | null;
  seat: string | null;
  createdAt: string;
  updatedAt: string;
};

function newId() {
  return `log_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function createOrUpdateLog(params: {
  userId: string;
  eventId: string;
  rating?: number | null;
  note?: string | null;
  section?: string | null;
  row?: string | null;
  seat?: string | null;
}) {
  const db = await initDb();
  const now = new Date().toISOString();

  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM user_logs WHERE user_id = ? AND event_id = ? LIMIT 1',
    params.userId,
    params.eventId
  );

  if (existing?.id) {
    await db.runAsync(
      `UPDATE user_logs SET rating = ?, note = ?, section = ?, row = ?, seat = ?, updated_at = ? WHERE id = ?`,
      params.rating ?? null,
      params.note ?? null,
      params.section ?? null,
      params.row ?? null,
      params.seat ?? null,
      now,
      existing.id
    );
    return existing.id;
  }

  const id = newId();
  await db.runAsync(
    `INSERT INTO user_logs (id, user_id, event_id, rating, note, section, row, seat, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    params.userId,
    params.eventId,
    params.rating ?? null,
    params.note ?? null,
    params.section ?? null,
    params.row ?? null,
    params.seat ?? null,
    now,
    now
  );

  return id;
}

export async function getLogCount(userId: string) {
  const db = await initDb();
  const row = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM user_logs WHERE user_id = ?', userId);
  return row?.c ?? 0;
}

export async function listLogsForUser(userId: string) {
  const db = await initDb();
  const rows = await db.getAllAsync<any>(
    `
    SELECT
      l.id as log_id,
      l.user_id,
      l.rating,
      l.note,
      l.section,
      l.row,
      l.seat,
      l.created_at as log_created_at,
      l.updated_at as log_updated_at,
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
    FROM user_logs l
    JOIN events e ON e.id = l.event_id
    JOIN artists a ON a.id = e.artist_id
    JOIN venues v ON v.id = e.venue_id
    WHERE l.user_id = ?
    ORDER BY e.date DESC
    LIMIT 200
    `,
    userId
  );

  const parseGenres = (raw: string | null) => {
    if (!raw) return [];
    try {
      const x = JSON.parse(raw);
      return Array.isArray(x) ? x.map(String) : [];
    } catch {
      return [];
    }
  };

  return rows.map((r) => ({
    id: r.log_id,
    userId: r.user_id,
    rating: r.rating,
    note: r.note,
    section: r.section,
    row: r.row,
    seat: r.seat,
    createdAt: r.log_created_at,
    updatedAt: r.log_updated_at,
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
  }));
}

export async function getLogForUserEvent(userId: string, eventId: string): Promise<UserLog | null> {
  const db = await initDb();
  const rows = await db.getAllAsync<any>(
    `
    SELECT
      l.id as log_id,
      l.user_id,
      l.rating,
      l.note,
      l.section,
      l.row,
      l.seat,
      l.created_at as log_created_at,
      l.updated_at as log_updated_at,
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
    FROM user_logs l
    JOIN events e ON e.id = l.event_id
    JOIN artists a ON a.id = e.artist_id
    JOIN venues v ON v.id = e.venue_id
    WHERE l.user_id = ? AND l.event_id = ?
    LIMIT 1
    `,
    userId,
    eventId
  );

  const r = rows[0];
  if (!r) return null;

  const parseGenres = (raw: string | null) => {
    if (!raw) return [];
    try {
      const x = JSON.parse(raw);
      return Array.isArray(x) ? x.map(String) : [];
    } catch {
      return [];
    }
  };

  return {
    id: r.log_id,
    userId: r.user_id,
    rating: r.rating,
    note: r.note,
    section: r.section,
    row: r.row,
    seat: r.seat,
    createdAt: r.log_created_at,
    updatedAt: r.log_updated_at,
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

export async function deleteLogById(logId: string) {
  const db = await initDb();
  await db.runAsync('DELETE FROM user_logs WHERE id = ?', logId);
}

export async function deleteLogForUserEvent(userId: string, eventId: string) {
  const db = await initDb();
  await db.runAsync('DELETE FROM user_logs WHERE user_id = ? AND event_id = ?', userId, eventId);
}



