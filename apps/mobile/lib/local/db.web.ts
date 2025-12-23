export const DB_NAME = 'sticket.db';

// Web fallback: we currently don’t ship the SQLite WASM worker in our static web export.
// To keep `expo export --platform web` working (and keep the UI functional), we provide
// a minimal in-memory/no-op DB that matches the small subset of methods our code uses.
//
// Notes:
// - Reads return empty results.
// - Writes are accepted but not persisted.
// - This is intentionally lightweight; native platforms still use `expo-sqlite`.

type QueryArgs = [sql: string, ...params: any[]];

type WebDb = {
  execAsync: (sql: string) => Promise<void>;
  runAsync: (...args: QueryArgs) => Promise<void>;
  getAllAsync: <T = any>(...args: QueryArgs) => Promise<T[]>;
  getFirstAsync: <T = any>(...args: QueryArgs) => Promise<T | null>;
  closeAsync: () => Promise<void>;
};

let dbPromise: Promise<WebDb> | null = null;

function createDb(): WebDb {
  return {
    execAsync: async () => {
      // no-op
    },
    runAsync: async () => {
      // no-op
    },
    getAllAsync: async () => {
      return [];
    },
    getFirstAsync: async () => {
      return null;
    },
    closeAsync: async () => {
      // no-op
    },
  };
}

export async function getDb() {
  if (!dbPromise) {
    dbPromise = Promise.resolve(createDb());
  }
  return await dbPromise;
}

export async function resetDb() {
  try {
    if (dbPromise) {
      const db = await dbPromise;
      await db.closeAsync();
    }
  } finally {
    dbPromise = null;
  }
}

export async function initDb() {
  // Keep call sites working; schema creation is a no-op on web.
  return await getDb();
}


