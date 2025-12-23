import { initDb } from '../db';

export type UserProfile = {
  userId: string;
  displayName: string | null;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
  city: string | null;
  onboardingCompleted: boolean;
  connectedMusic: boolean;
  createdAt: string;
  updatedAt: string;
};

function rowToProfile(row: any): UserProfile {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    username: row.username,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    city: row.city,
    onboardingCompleted: Boolean(row.onboarding_completed),
    connectedMusic: Boolean(row.connected_music),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function ensureProfile(userId: string) {
  const db = await initDb();
  const now = new Date().toISOString();

  const existing = await db.getFirstAsync<{ user_id: string }>('SELECT user_id FROM user_profiles WHERE user_id = ?', userId);
  if (existing?.user_id) return;

  await db.runAsync(
    'INSERT INTO user_profiles (user_id, created_at, updated_at) VALUES (?, ?, ?)',
    userId,
    now,
    now
  );
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const db = await initDb();
  const row = await db.getFirstAsync<any>('SELECT * FROM user_profiles WHERE user_id = ? LIMIT 1', userId);
  if (!row) return null;
  return rowToProfile(row);
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<UserProfile, 'displayName' | 'username' | 'bio' | 'avatarUrl' | 'city' | 'onboardingCompleted' | 'connectedMusic'>>
) {
  const db = await initDb();
  const now = new Date().toISOString();

  // Simple patch builder
  const fields: string[] = [];
  const values: any[] = [];

  if (patch.displayName !== undefined) {
    fields.push('display_name = ?');
    values.push(patch.displayName);
  }
  if (patch.username !== undefined) {
    fields.push('username = ?');
    values.push(patch.username);
  }
  if (patch.bio !== undefined) {
    fields.push('bio = ?');
    values.push(patch.bio);
  }
  if (patch.avatarUrl !== undefined) {
    fields.push('avatar_url = ?');
    values.push(patch.avatarUrl);
  }
  if (patch.city !== undefined) {
    fields.push('city = ?');
    values.push(patch.city);
  }
  if (patch.onboardingCompleted !== undefined) {
    fields.push('onboarding_completed = ?');
    values.push(patch.onboardingCompleted ? 1 : 0);
  }
  if (patch.connectedMusic !== undefined) {
    fields.push('connected_music = ?');
    values.push(patch.connectedMusic ? 1 : 0);
  }

  fields.push('updated_at = ?');
  values.push(now);

  values.push(userId);

  await db.runAsync(`UPDATE user_profiles SET ${fields.join(', ')} WHERE user_id = ?`, ...values);
}



