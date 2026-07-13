// Thread page — one tour discussion thread (Reddit-lite v1).
// Header: thread title 20/800 + a mono "@author · TOUR" breadcrumb that
// returns to the tour (back() when we came from it, push otherwise) →
// messages as quiet MessageRows (long-press → report sheet; a successful
// report swaps the row's mono age for a brief "REPORTED") → a composer
// pinned to the bottom (input + ink send button). Pull-to-refresh.
//
// APIs: GET /threads/:id · POST /threads/:id/messages ·
// POST /threads/:id/report (lib/api/threads.ts). Route params passed by
// the tour page (title/author/tourId/tourName) hydrate the header
// instantly while the detail loads — and keep the page meaningful until
// the backend (landing in parallel) is live: the fetch failing shows a
// quiet retry state and hides the composer.

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { QuietEmpty } from '../../components/entity/EntityBits';
import { EntityNav } from '../../components/entity/EntityChrome';
import { EntityError, RowSkeletons, ShimmerBlock } from '../../components/entity/EntityStates';
import { MessageRow } from '../../components/threads/MessageRow';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { PillButton } from '../../components/ui/PillButton';
import { SpringPressable } from '../../components/ui/SpringPressable';

import {
  getThread,
  postThreadMessage,
  reportInThread,
  type ThreadDetail,
  type ThreadMessage,
} from '../../lib/api/threads';
import { haptics } from '../../lib/motion';
import { useSafeBack } from '../../lib/navigation/safeNavigation';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

/** How long a row wears the "REPORTED" swap before the age returns. */
const REPORTED_FLASH_MS = 2000;

type ThreadParams = {
  threadId: string;
  tourId?: string;
  tourName?: string;
  title?: string;
  author?: string;
  /** '1' when the tour page pushed us — breadcrumb can simply back(). */
  fromTour?: string;
};

export default function ThreadScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goBack = useSafeBack();
  const { tokens } = useTheme();
  const params = useLocalSearchParams<ThreadParams>();

  const threadId = params.threadId ? String(params.threadId) : '';

  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  // Long-press target for the report sheet + the brief per-row "REPORTED".
  const [reportTarget, setReportTarget] = useState<ThreadMessage | null>(null);
  const [reporting, setReporting] = useState(false);
  const [reportedIds, setReportedIds] = useState<Record<string, true>>({});
  const reportTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(
    () => () => {
      reportTimers.current.forEach(clearTimeout);
    },
    [],
  );

  const listRef = useRef<FlatList<ThreadMessage>>(null);

  const load = useCallback(async () => {
    if (!threadId) {
      setStatus('error');
      return;
    }
    try {
      const detail = await getThread(threadId);
      setThread(detail);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [threadId]);

  useEffect(() => {
    setStatus('loading');
    void load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  // ── Header display model: fetched detail, falling back to params ──
  const title = thread?.title ?? (params.title ? String(params.title) : '');
  const authorUsername = thread?.author.username ?? (params.author ? String(params.author) : '');
  const tourId = thread?.tourId ?? (params.tourId ? String(params.tourId) : '');
  const tourName = params.tourName ? String(params.tourName) : '';

  // Oldest first (the opener leads); defensive sort in case the server
  // ever returns another order.
  const messages = useMemo(() => {
    const list = thread?.messages ?? [];
    return [...list].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [thread?.messages]);

  // Breadcrumb → the tour: back() when the tour pushed us (keeps the
  // stack clean), a plain push on deep entries.
  const openTour = useCallback(() => {
    if (params.fromTour === '1' && router.canGoBack()) {
      router.back();
      return;
    }
    if (tourId) {
      router.push({
        pathname: '/tour/[tourId]',
        params: { tourId, ...(tourName ? { tourName } : {}) },
      });
    } else {
      goBack();
    }
  }, [goBack, params.fromTour, router, tourId, tourName]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending || !threadId) return;
    setSending(true);
    try {
      const created = await postThreadMessage(threadId, text);
      haptics.success();
      setDraft('');
      setThread((prev) =>
        prev ? { ...prev, messages: [...prev.messages, created] } : prev,
      );
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch {
      haptics.error();
    } finally {
      setSending(false);
    }
  };

  const handleReport = async () => {
    const target = reportTarget;
    if (!target || reporting) return;
    setReporting(true);
    try {
      await reportInThread(threadId, { messageId: target.id });
      haptics.success();
      setReportTarget(null);
      setReportedIds((prev) => ({ ...prev, [target.id]: true }));
      reportTimers.current.push(
        setTimeout(() => {
          setReportedIds((prev) => {
            const next = { ...prev };
            delete next[target.id];
            return next;
          });
        }, REPORTED_FLASH_MS),
      );
    } catch {
      haptics.error();
      setReportTarget(null);
    } finally {
      setReporting(false);
    }
  };

  const styles = useThemedStyles((t) => ({
    screen: { flex: 1, backgroundColor: t.colors.bg },
    headerBlock: { paddingHorizontal: t.density.pad, paddingTop: 10, paddingBottom: 8 },
    title: {
      fontSize: 20,
      fontWeight: '800',
      letterSpacing: -0.4,
      color: t.colors.fg,
      lineHeight: 25,
    },
    breadcrumb: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 11,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: t.colors.mute,
      marginTop: 8,
    },
    listContent: { paddingHorizontal: t.density.pad, paddingBottom: 24 },
    retryRow: { flexDirection: 'row', marginTop: 10 },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
      paddingHorizontal: t.density.pad,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: t.colors.hairline,
      backgroundColor: t.colors.bg,
    },
    composerInput: {
      flex: 1,
      backgroundColor: t.colors.card2,
      borderRadius: t.radius.full,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 14,
      color: t.colors.fg,
      maxHeight: 100,
    },
    // Send button is INK — the monochrome inversion, never an accent fill.
    sendButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: t.colors.inverseBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonDisabled: { opacity: 0.4 },
    sheetBody: { paddingHorizontal: 20, paddingTop: 4 },
    sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
    sheetRowText: { fontSize: 15, fontWeight: '600', color: t.colors.fg },
    sheetHint: { fontSize: 12.5, color: t.colors.mute, lineHeight: 18, paddingBottom: 8 },
  }));

  // ── Full-page error: fetch failed and params gave us nothing ──
  if (status === 'error' && !title) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ paddingTop: insets.top }}>
          <EntityNav onBack={goBack} />
        </View>
        <EntityError
          title="Couldn't load this thread"
          onRetry={() => {
            setStatus('loading');
            void load();
          }}
          onBack={goBack}
        />
      </View>
    );
  }

  const header = (
    <View style={styles.headerBlock}>
      {status === 'loading' && !title ? (
        <View style={{ gap: 10 }}>
          <ShimmerBlock width="78%" height={22} borderRadius={8} />
          <ShimmerBlock width="44%" height={12} borderRadius={6} />
        </View>
      ) : (
        <>
          <Text style={styles.title}>{title}</Text>
          <SpringPressable
            haptic="light"
            onPress={openTour}
            accessibilityRole="button"
            accessibilityLabel={tourName ? `Back to ${tourName}` : 'Back to the tour'}
            style={{ alignSelf: 'flex-start' }}
          >
            <Text style={styles.breadcrumb} numberOfLines={1}>
              {authorUsername ? `@${authorUsername} · ` : ''}
              {tourName || 'Tour'} →
            </Text>
          </SpringPressable>
        </>
      )}

      {status === 'loading' ? (
        <View style={{ marginHorizontal: -tokens.density.pad, marginTop: 12 }}>
          <RowSkeletons count={3} />
        </View>
      ) : status === 'error' ? (
        <View style={{ marginTop: 20 }}>
          <QuietEmpty text="Couldn't load this thread yet." />
          <View style={styles.retryRow}>
            <PillButton
              title="Try again"
              variant="secondary"
              size="sm"
              springFeedback
              haptic="light"
              onPress={() => {
                setStatus('loading');
                void load();
              }}
            />
          </View>
        </View>
      ) : messages.length === 0 ? (
        <View style={{ marginTop: 20 }}>
          <QuietEmpty text="No replies yet — say something." />
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ paddingTop: insets.top }}>
        <EntityNav onBack={goBack} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={listRef}
          data={status === 'ready' ? messages : []}
          keyExtractor={(item: ThreadMessage) => item.id}
          renderItem={({ item, index }) => (
            <MessageRow
              author={item.author}
              text={item.text}
              createdAt={item.createdAt}
              index={index}
              reported={Boolean(reportedIds[item.id])}
              onLongPress={() => {
                haptics.medium();
                setReportTarget(item);
              }}
            />
          )}
          ListHeaderComponent={header}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void handleRefresh()}
              tintColor={tokens.colors.mute}
              colors={[tokens.colors.fg]}
              progressBackgroundColor={tokens.colors.card2}
            />
          }
        />

        {/* ── Composer — pinned; only when the thread actually loaded ── */}
        {status === 'ready' ? (
          <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <TextInput
              style={styles.composerInput}
              placeholder="Reply…"
              placeholderTextColor={tokens.colors.muteSoft}
              value={draft}
              onChangeText={setDraft}
              maxLength={1000}
              multiline
            />
            <SpringPressable
              haptic="light"
              disabled={!draft.trim() || sending}
              shakeWhenDisabled={false}
              onPress={() => void handleSend()}
              accessibilityRole="button"
              accessibilityLabel="Send reply"
              style={[styles.sendButton, (!draft.trim() || sending) && styles.sendButtonDisabled]}
            >
              <Ionicons name="arrow-up" size={18} color={tokens.colors.inverseFg} />
            </SpringPressable>
          </View>
        ) : null}
      </KeyboardAvoidingView>

      {/* ── Long-press action sheet — Report is the only v1 action ── */}
      <BottomSheet
        visible={reportTarget != null}
        onClose={() => setReportTarget(null)}
        maxHeightRatio={0.35}
        accessibilityLabel="Message actions"
      >
        <View style={styles.sheetBody}>
          <SpringPressable
            haptic="light"
            disabled={reporting}
            shakeWhenDisabled={false}
            onPress={() => void handleReport()}
            accessibilityRole="button"
            accessibilityLabel="Report message"
            style={styles.sheetRow}
          >
            <Ionicons name="flag-outline" size={16} color={tokens.colors.fg} />
            <Text style={styles.sheetRowText}>{reporting ? 'Reporting…' : 'Report message'}</Text>
          </SpringPressable>
          <Text style={styles.sheetHint}>Flags it for review. The crowd keeps it kind.</Text>
        </View>
      </BottomSheet>
    </View>
  );
}
