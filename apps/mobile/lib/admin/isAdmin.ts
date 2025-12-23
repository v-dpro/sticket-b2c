type AdminUser = { email?: string | null; id?: string | null };

function parseList(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminUser(user: AdminUser | null | undefined): boolean {
  if (!user) return false;

  // Comma-separated list, e.g. "me@sticket.in,other@sticket.in"
  const emails = parseList(process.env.EXPO_PUBLIC_ADMIN_EMAILS);
  const ids = parseList(process.env.EXPO_PUBLIC_ADMIN_USER_IDS);

  const email = (user.email ?? '').trim().toLowerCase();
  const id = (user.id ?? '').trim().toLowerCase();

  if (email && emails.includes(email)) return true;
  if (id && ids.includes(id)) return true;

  return false;
}



