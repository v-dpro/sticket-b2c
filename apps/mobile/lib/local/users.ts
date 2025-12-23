import { initDb } from './db';
import { hashPassword, newSalt } from './password';
import { ensureProfile } from './repo/profileRepo';

export type LocalUser = {
  id: string;
  email: string;
  createdAt: string;
};

function newId() {
  // Fine for local-only.
  return `user_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function createUser(email: string, password: string): Promise<LocalUser> {
  const db = await initDb();

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM users WHERE email = ? LIMIT 1',
    normalizedEmail
  );
  if (existing?.id) {
    throw new Error('Email already in use');
  }

  const id = newId();
  const salt = newSalt();
  const passwordHash = await hashPassword(password, salt);
  const createdAt = new Date().toISOString();

  await db.runAsync(
    'INSERT INTO users (id, email, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
    id,
    normalizedEmail,
    salt,
    passwordHash,
    createdAt
  );

  await ensureProfile(id);

  return { id, email: normalizedEmail, createdAt };
}

export async function verifyUser(email: string, password: string): Promise<LocalUser> {
  const db = await initDb();

  const normalizedEmail = email.trim().toLowerCase();
  const row = await db.getFirstAsync<{
    id: string;
    email: string;
    password_salt: string;
    password_hash: string;
    created_at: string;
  }>('SELECT * FROM users WHERE email = ? LIMIT 1', normalizedEmail);

  if (!row) {
    throw new Error('Invalid email or password');
  }

  const expectedHash = await hashPassword(password, row.password_salt);
  if (expectedHash !== row.password_hash) {
    throw new Error('Invalid email or password');
  }

  return { id: row.id, email: row.email, createdAt: row.created_at };
}

export async function getUserById(id: string): Promise<LocalUser | null> {
  const db = await initDb();

  const row = await db.getFirstAsync<{ id: string; email: string; created_at: string }>(
    'SELECT id, email, created_at FROM users WHERE id = ? LIMIT 1',
    id
  );

  if (!row) return null;
  return { id: row.id, email: row.email, createdAt: row.created_at };
}

// Upsert a local user record using a server-issued user id.
// This lets us keep the existing local-first onboarding/logging flows while auth is backed by the API.
export async function upsertUserFromRemote(remote: { id: string; email: string }): Promise<LocalUser> {
  const db = await initDb();

  const id = remote.id;
  const normalizedEmail = remote.email.trim().toLowerCase();

  const existingById = await db.getFirstAsync<{ id: string; email: string; created_at: string }>(
    'SELECT id, email, created_at FROM users WHERE id = ? LIMIT 1',
    id
  );
  if (existingById) {
    // Keep email in sync if it changed.
    if (existingById.email !== normalizedEmail) {
      await db.runAsync('UPDATE users SET email = ? WHERE id = ?', normalizedEmail, id);
    }
    await ensureProfile(id);
    return { id: existingById.id, email: normalizedEmail, createdAt: existingById.created_at };
  }

  const existingByEmail = await db.getFirstAsync<{ id: string }>('SELECT id FROM users WHERE email = ? LIMIT 1', normalizedEmail);
  if (existingByEmail?.id) {
    // Email already used locally; just return that user (and keep profile).
    await ensureProfile(existingByEmail.id);
    const u = await getUserById(existingByEmail.id);
    if (u) return u;
  }

  // We must satisfy NOT NULL constraints for password columns, even though we won't use them for remote auth.
  const salt = newSalt();
  const passwordHash = await hashPassword(`remote:${id}:${Date.now()}`, salt);
  const createdAt = new Date().toISOString();

  await db.runAsync(
    'INSERT INTO users (id, email, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
    id,
    normalizedEmail,
    salt,
    passwordHash,
    createdAt
  );

  await ensureProfile(id);

  return { id, email: normalizedEmail, createdAt };
}



