// Web implementation of our SecureStore wrapper.
// We intentionally do NOT use `expo-secure-store` on web because its native module
// interface can be unavailable in static exports.

function safeLocalStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export async function getItemAsync(key: string): Promise<string | null> {
  const ls = safeLocalStorage();
  if (!ls) return null;
  try {
    return ls.getItem(key);
  } catch {
    return null;
  }
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  const ls = safeLocalStorage();
  if (!ls) return;
  try {
    ls.setItem(key, value);
  } catch {
    // ignore
  }
}

export async function deleteItemAsync(key: string): Promise<void> {
  const ls = safeLocalStorage();
  if (!ls) return;
  try {
    ls.removeItem(key);
  } catch {
    // ignore
  }
}

export async function isAvailableAsync(): Promise<boolean> {
  return safeLocalStorage() != null;
}


