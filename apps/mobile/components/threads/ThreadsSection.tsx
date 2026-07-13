// ThreadsSection — the tour page's THREADS block (Reddit-lite tour talk).
// Self-fetching, like TrendsRail: pass a tourId and it loads its own list.
// Rows: title 15/700 over a mono "@author · 12 REPLIES · 2H AGO" meta line,
// tap → /thread/[id]. "Start a thread" opens the NewThreadSheet composer.
//
// The backend is landing in parallel — a failed list fetch degrades to the
// same one-line empty state + button, so the section still sells the
// feature before the routes exist.

import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';

import { createTourThread, getTourThreads, type ThreadSummary } from '../../lib/api/threads';
import { durations, tearIn } from '../../lib/motion';
import { useThemedStyles } from '../../lib/theme-context';
import { QuietEmpty, SectionLabel } from '../entity/EntityBits';
import { ShimmerBlock } from '../entity/EntityStates';
import { PillButton } from '../ui/PillButton';
import { SpringPressable } from '../ui/SpringPressable';
import { monoAge } from './MessageRow';
import { NewThreadSheet } from './NewThreadSheet';

type ThreadsSectionProps = {
  tourId: string;
  /** Threads pass it along so the thread page's breadcrumb hydrates instantly. */
  tourName?: string;
};

export function ThreadsSection({ tourId, tourName }: ThreadsSectionProps) {
  const router = useRouter();
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [composerOpen, setComposerOpen] = useState(false);

  const load = useCallback(async () => {
    if (!tourId) return;
    try {
      const res = await getTourThreads(tourId);
      setThreads(Array.isArray(res?.threads) ? res.threads : []);
      setStatus('ready');
    } catch {
      // Endpoint not live yet (or down) — degrade to the empty state.
      setThreads([]);
      setStatus('error');
    }
  }, [tourId]);

  useEffect(() => {
    setStatus('loading');
    void load();
  }, [load]);

  const openThread = useCallback(
    (thread: ThreadSummary) =>
      router.push({
        pathname: '/thread/[threadId]',
        params: {
          threadId: thread.id,
          tourId,
          ...(tourName ? { tourName } : {}),
          title: thread.title,
          author: thread.author.username,
          fromTour: '1',
        },
      }),
    [router, tourId, tourName],
  );

  // POST, prepend, then jump straight into the new thread.
  const handleCreate = useCallback(
    async (input: { title: string; text?: string }) => {
      const created = await createTourThread(tourId, input);
      setThreads((prev) => [created, ...prev.filter((t) => t.id !== created.id)]);
      openThread(created);
    },
    [openThread, tourId],
  );

  const styles = useThemedStyles((t) => ({
    section: { marginTop: 28 },
    row: { paddingVertical: 10 },
    rowTitle: { fontSize: 15, fontWeight: '700', color: t.colors.fg, lineHeight: 20 },
    rowMeta: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 10.5,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: t.colors.mute,
      marginTop: 4,
    },
    buttonRow: { flexDirection: 'row', marginTop: 12 },
  }));

  return (
    <View style={styles.section}>
      <SectionLabel>Threads</SectionLabel>

      {status === 'loading' ? (
        <View style={{ gap: 10 }}>
          <ShimmerBlock width="82%" height={15} borderRadius={7} />
          <ShimmerBlock width="52%" height={11} borderRadius={6} />
        </View>
      ) : threads.length === 0 ? (
        <QuietEmpty text="Planning this tour? Ask the crowd." />
      ) : (
        threads.map((thread, i) => (
          <Animated.View key={thread.id} entering={tearIn(Math.min(i, 8) * durations.stagger)}>
            <SpringPressable
              haptic="light"
              onPress={() => openThread(thread)}
              accessibilityRole="button"
              accessibilityLabel={`Open thread ${thread.title}`}
              style={styles.row}
            >
              <Text style={styles.rowTitle} numberOfLines={2}>
                {thread.title}
              </Text>
              <Text style={styles.rowMeta} numberOfLines={1}>
                @{thread.author.username} · {thread.messageCount}{' '}
                {thread.messageCount === 1 ? 'REPLY' : 'REPLIES'} · {monoAge(thread.lastActivityAt)}
              </Text>
            </SpringPressable>
          </Animated.View>
        ))
      )}

      <View style={styles.buttonRow}>
        <PillButton
          title="Start a thread"
          variant="ghost"
          size="sm"
          springFeedback
          haptic="light"
          onPress={() => setComposerOpen(true)}
        />
      </View>

      <NewThreadSheet
        visible={composerOpen}
        onClose={() => setComposerOpen(false)}
        onCreate={handleCreate}
      />
    </View>
  );
}
