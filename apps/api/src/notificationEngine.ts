// Notification engine: creates in-app Notification rows and fans out Expo
// push messages to each recipient's registered PushToken rows.
//
// Notification *preferences* are not persisted anywhere yet (the
// /notifications/preferences endpoints in index.ts are stubs whose defaults
// are all-on), so the engine sends every notification type. When a prefs
// model lands, gate sends per-type here so every call site inherits it.
//
// All entry points are fire-and-forget safe: they never reject, so call
// sites can `void notify(...)` without wrapping in try/catch.

import { Expo, type ExpoPushMessage, type ExpoPushTicket } from 'expo-server-sdk';

import { prisma } from './lib/prisma.js';

const expo = new Expo();

export type NotifyPayload = {
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  /** Who triggered the notification (rendered as the avatar in the app). */
  actorId?: string | null;
};

/** Create an in-app Notification row + push it to one user. Never rejects. */
export async function notify(userId: string, payload: NotifyPayload): Promise<void> {
  return notifyMany([userId], payload);
}

/**
 * Batched notify: one createMany for the in-app rows, one chunked Expo push
 * fan-out for every recipient token. The in-app rows are awaited; push
 * delivery runs in the background. Never rejects.
 */
export async function notifyMany(userIds: string[], payload: NotifyPayload): Promise<void> {
  const recipients = [...new Set(userIds.filter(Boolean))];
  if (!recipients.length) return;

  try {
    await prisma.notification.createMany({
      data: recipients.map((userId) => ({
        userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        data: (payload.data ?? {}) as object,
        actorId: payload.actorId ?? null,
      })),
    });
  } catch (error) {
    console.error('[Notify] Failed to create notification rows:', error);
    return; // No rows -> don't push either.
  }

  // Push delivery is best-effort and off the request path. Users with no
  // registered token simply get no push (the in-app row still lands).
  void sendPush(recipients, payload).catch((error) => {
    console.error('[Notify] Push fan-out failed:', error);
  });
}

async function sendPush(userIds: string[], payload: NotifyPayload): Promise<void> {
  const tokens = await prisma.pushToken.findMany({
    where: { userId: { in: userIds } },
    select: { token: true },
  });
  if (!tokens.length) return;

  const messages: ExpoPushMessage[] = [];
  for (const { token } of tokens) {
    if (!Expo.isExpoPushToken(token)) continue;
    messages.push({
      to: token,
      sound: 'default',
      title: payload.title,
      body: payload.body,
      data: { type: payload.type, ...(payload.data ?? {}) },
    });
  }
  if (!messages.length) return;

  const tickets: Array<{ token: string; ticket: ExpoPushTicket }> = [];
  for (const chunk of expo.chunkPushNotifications(messages)) {
    try {
      const chunkTickets = await expo.sendPushNotificationsAsync(chunk);
      chunkTickets.forEach((ticket, i) => {
        tickets.push({ token: chunk[i]!.to as string, ticket });
      });
    } catch (error) {
      console.error('[Notify] Expo push chunk failed:', error);
    }
  }

  // Prune tokens Expo reports as gone so we stop pushing to dead devices.
  const deadTokens = tickets
    .filter(({ ticket }) => ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered')
    .map(({ token }) => token);
  if (deadTokens.length) {
    await prisma.pushToken.deleteMany({ where: { token: { in: deadTokens } } });
    console.log(`[Notify] Pruned ${deadTokens.length} unregistered push token(s)`);
  }
}

// ==================== SCHEDULED JOBS ====================
// setInterval-based (node-cron isn't a dependency); every tick is wrapped so
// a bad sweep can't crash the process.
//
// At-most-once state is IN MEMORY (PresaleAlert has no notifiedAt column and
// adding one is out of scope): a restart inside a presale's 30-minute warning
// window can re-send that alert, and a restart between 10:00 and 10:59 can
// re-send the morning nudge. Both are at-most-once per boot.

const PRESALE_SWEEP_MS = 5 * 60 * 1000;
const PRESALE_LOOKAHEAD_MS = 30 * 60 * 1000;
const NUDGE_CHECK_MS = 5 * 60 * 1000;
const NUDGE_HOUR = 10; // ~10:00 server time

const presaleAlertsSent = new Set<string>(); // PresaleAlert ids notified this boot
let lastNudgeDate: string | null = null; // YYYY-MM-DD of the last nudge run

export function startNotificationJobs(): void {
  setInterval(() => void runSafely('presale sweep', sweepPresaleAlerts), PRESALE_SWEEP_MS);
  setInterval(() => void runSafely('morning nudge', maybeSendMorningNudge), NUDGE_CHECK_MS);

  // Initial presale sweep shortly after boot so a restart doesn't skip a window.
  setTimeout(() => void runSafely('presale sweep (initial)', sweepPresaleAlerts), 10_000);

  console.log(
    `[Notify] Jobs registered: presale sweep every ${PRESALE_SWEEP_MS / 60_000}m ` +
      `(${PRESALE_LOOKAHEAD_MS / 60_000}m lookahead), morning nudge at ~${NUDGE_HOUR}:00 server time`
  );
}

async function runSafely(name: string, job: () => Promise<void>): Promise<void> {
  try {
    await job();
  } catch (error) {
    console.error(`[Notify] ${name} failed:`, error);
  }
}

/** Alert users whose presale (with notifyStart on) starts within 30 minutes. */
async function sweepPresaleAlerts(): Promise<void> {
  const now = new Date();
  const alerts = await prisma.presaleAlert.findMany({
    where: {
      notifyStart: true,
      presale: { presaleStart: { gt: now, lte: new Date(now.getTime() + PRESALE_LOOKAHEAD_MS) } },
    },
    include: {
      presale: {
        select: { id: true, artistName: true, venueName: true, presaleType: true, presaleStart: true, code: true },
      },
    },
  });

  for (const alert of alerts) {
    if (presaleAlertsSent.has(alert.id)) continue;
    presaleAlertsSent.add(alert.id); // mark before awaiting so overlapping ticks can't double-send

    const { presale } = alert;
    const startsAt = presale.presaleStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    await notify(alert.userId, {
      type: 'presale_alert',
      title: 'Presale starts soon',
      body: `${presale.artistName} — ${presale.presaleType} presale at ${presale.venueName} starts at ${startsAt}`,
      data: {
        presaleId: presale.id,
        ...(alert.notifyCode && presale.code ? { code: presale.code } : {}),
      },
    });
  }

  if (alerts.length) console.log(`[Notify] Presale sweep: ${alerts.length} alert(s) in window`);
}

/**
 * Once per day at ~10:00 server time: nudge users whose log from yesterday
 * is still bare (no photos, never shared as a memory) — one per user.
 */
async function maybeSendMorningNudge(): Promise<void> {
  const now = new Date();
  if (now.getHours() !== NUDGE_HOUR) return;

  const todayKey = now.toISOString().slice(0, 10);
  if (lastNudgeDate === todayKey) return;
  lastNudgeDate = todayKey;

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);

  const logs = await prisma.userLog.findMany({
    where: {
      createdAt: { gte: startOfYesterday, lt: startOfToday },
      sharedAt: null,
      photos: { none: {} },
    },
    select: { userId: true, eventId: true, event: { select: { name: true } } },
  });

  // One nudge per user even if they logged multiple bare shows.
  const firstLogByUser = new Map<string, (typeof logs)[number]>();
  for (const log of logs) {
    if (!firstLogByUser.has(log.userId)) firstLogByUser.set(log.userId, log);
  }

  for (const [userId, log] of firstLogByUser) {
    await notify(userId, {
      type: 'post_show',
      title: "Last night's show — make it a memory",
      body: `Add photos to your ${log.event.name} log`,
      data: { eventId: log.eventId },
    });
  }

  if (firstLogByUser.size) console.log(`[Notify] Morning nudge sent to ${firstLogByUser.size} user(s)`);
}
