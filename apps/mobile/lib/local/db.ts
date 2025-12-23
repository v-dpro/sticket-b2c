import * as SQLite from 'expo-sqlite';

export const DB_NAME = 'sticket.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  }
  return await dbPromise;
}

export async function resetDb() {
  try {
    if (dbPromise) {
      const db = await dbPromise;
      await db.closeAsync();
    }
  } catch {
    // ignore
  } finally {
    dbPromise = null;
  }

  // Delete the underlying database file.
  // (This API exists in expo-sqlite@16+)
  await SQLite.deleteDatabaseAsync(DB_NAME);
}

export async function initDb() {
  const db = await getDb();

  // Local-first schema for MVP prototyping.
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id TEXT PRIMARY KEY NOT NULL,
      display_name TEXT,
      username TEXT,
      bio TEXT,
      avatar_url TEXT,
      city TEXT,
      onboarding_completed INTEGER NOT NULL DEFAULT 0,
      connected_music INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS artists (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      image_url TEXT,
      genres TEXT, -- JSON array
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS venues (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT,
      country TEXT NOT NULL,
      lat REAL,
      lng REAL,
      capacity INTEGER,
      image_url TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      date TEXT NOT NULL, -- ISO string
      image_url TEXT,
      source TEXT,
      external_id TEXT,
      artist_id TEXT NOT NULL,
      venue_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(artist_id, venue_id, date),
      FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE,
      FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_logs (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      rating REAL,
      note TEXT,
      section TEXT,
      row TEXT,
      seat TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, event_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_tickets (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      section TEXT,
      row TEXT,
      seat TEXT,
      barcode TEXT,
      status TEXT NOT NULL DEFAULT 'KEEPING',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_interested (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      notify_on_sale INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, event_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );
  `);

  return db;
}



