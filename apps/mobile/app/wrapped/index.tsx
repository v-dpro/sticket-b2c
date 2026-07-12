// app/wrapped/index.tsx — STICKET WRAPPED, the shareable year recap.
//
// A full-screen vertical PAGER (FlatList pagingEnabled) of full-bleed cards:
// title → big number → top artist → best night → months strip → stats grid →
// closing. Sparse years degrade gracefully: 0 shows renders a friendly
// "your year starts with one show" state; 1–2 shows drop the artist/months/
// grid cards.
//
// SINGLE-THEME EXCEPTION: Wrapped commits to the dark stage regardless of
// the app theme (see components/wrapped/cards.tsx) — it is a share artifact,
// and every captured PNG must look the same for every user.
//
// SHARE — every page is capturable: each card renders inside a collapsable-
// false View whose ref feeds react-native-view-shot's captureRef; all screen
// chrome (close, share icon, page dots, the closing CTA) is layered OUTSIDE
// those refs so captures come out clean. The PNG is captured at 3× the
// on-screen card size (IG-story friendly on any device) and handed to the
// existing expo-sharing share sheet (lib/share/shareUtils).
//
// Deep link: this file registers the /wrapped route (expo-router file-based
// routing), so sticket://wrapped opens it directly.

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
  type HostInstance,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { captureRef } from 'react-native-view-shot';

import {
  BestNightCard,
  BigNumberCard,
  BrandMark,
  ClosingCard,
  MonthsCard,
  STAGE_BG,
  StatsGridCard,
  TitleCard,
  TopArtistCard,
} from '../../components/wrapped/cards';
import { useWrappedData, type WrappedStats } from '../../components/wrapped/useWrappedData';
import { SpringPressable } from '../../components/ui/SpringPressable';
import { shareImage } from '../../lib/share/shareUtils';
import { haptics } from '../../lib/motion';
import { darkTokens } from '../../lib/theme';
import { useSession } from '../../hooks/useSession';

// Stage-fixed colors (dark in both themes — see header note).
const c = darkTokens.colors;
const mono = darkTokens.fontFamilies;

type PageKind = 'title' | 'count' | 'artist' | 'best' | 'months' | 'grid' | 'closing';
type Page = { key: PageKind };

/** Deck assembly — sparse years get fewer cards, never broken ones. */
function buildPages(stats: WrappedStats): Page[] {
  const pages: Page[] = [{ key: 'title' }, { key: 'count' }];
  if (stats.totalShows >= 3) {
    if (stats.topArtist) pages.push({ key: 'artist' });
    if (stats.bestNight) pages.push({ key: 'best' });
    pages.push({ key: 'months' }, { key: 'grid' });
  } else if (stats.bestNight) {
    // 1–2 shows: the single best night still deserves its card.
    pages.push({ key: 'best' });
  }
  pages.push({ key: 'closing' });
  return pages;
}

type CardNode = HostInstance;

export default function WrappedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const year = useMemo(() => new Date().getFullYear(), []);
  const { status, stats, retry } = useWrappedData(user?.id ?? null, year);

  // Page geometry — measured, so paging is exact on every device.
  const [pageH, setPageH] = useState(0);
  const [pageW, setPageW] = useState(0);
  const [page, setPage] = useState(0);
  const pageRef = useRef(0);
  const cardRefs = useRef<(CardNode | null)[]>([]);
  const [sharing, setSharing] = useState(false);

  const pages = useMemo(() => (stats ? buildPages(stats) : []), [stats]);

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/you');
  }, [router]);

  // Light haptic per page snap (motion contract: carousel snap = light).
  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (pageH <= 0) return;
      const index = Math.max(
        0,
        Math.min(pages.length - 1, Math.round(e.nativeEvent.contentOffset.y / pageH)),
      );
      if (index !== pageRef.current) {
        pageRef.current = index;
        haptics.light(); // the deck clicked onto a new card
        setPage(index);
      }
    },
    [pageH, pages.length],
  );

  // ── Share: capture the CURRENT card → system share sheet ─────────
  const shareCurrent = useCallback(async () => {
    const node = cardRefs.current[page];
    if (!node || sharing || pageH <= 0 || pageW <= 0) return;
    setSharing(true);
    haptics.medium();
    try {
      const uri = await captureRef(
        { current: node },
        {
          format: 'png',
          quality: 1,
          result: 'tmpfile',
          // 3× the on-screen card — story-resolution output on any device.
          width: Math.round(pageW * 3),
          height: Math.round(pageH * 3),
        },
      );
      await shareImage(uri, `My ${year} in shows`);
    } catch {
      // Capture/share is best-effort — never crash the recap.
    } finally {
      setSharing(false);
    }
  }, [page, sharing, pageH, pageW, year]);

  const renderItem = useCallback(
    ({ item, index }: { item: Page; index: number }) => {
      if (!stats) return null;
      let card: React.ReactNode = null;
      switch (item.key) {
        case 'title':
          card = <TitleCard stats={stats} />;
          break;
        case 'count':
          card = <BigNumberCard stats={stats} />;
          break;
        case 'artist':
          card = <TopArtistCard stats={stats} />;
          break;
        case 'best':
          card = <BestNightCard stats={stats} />;
          break;
        case 'months':
          card = <MonthsCard stats={stats} />;
          break;
        case 'grid':
          card = <StatsGridCard stats={stats} />;
          break;
        case 'closing':
          card = <ClosingCard stats={stats} />;
          break;
      }
      return (
        <View
          ref={(node) => {
            cardRefs.current[index] = node;
          }}
          collapsable={false}
          style={{ height: pageH, width: pageW }}
        >
          {card}
        </View>
      );
    },
    [stats, pageH, pageW],
  );

  const getItemLayout = useCallback(
    (_data: ArrayLike<Page> | null | undefined, index: number) => ({
      length: pageH,
      offset: pageH * index,
      index,
    }),
    [pageH],
  );

  const isEmptyYear = status === 'ready' && stats !== null && stats.totalShows === 0;
  const lastPage = pages.length - 1;

  return (
    <View
      style={styles.screen}
      onLayout={(e) => {
        setPageH(e.nativeEvent.layout.height);
        setPageW(e.nativeEvent.layout.width);
      }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      {/* Dark stage in both themes — force light status bar content. */}
      <StatusBar style="light" />

      {/* ── The pager ─────────────────────────────────────────────── */}
      {status === 'ready' && stats && !isEmptyYear && pageH > 0 ? (
        <Animated.View entering={FadeIn.duration(250)} style={styles.fill}>
          <FlatList
            data={pages}
            renderItem={renderItem}
            keyExtractor={(p: Page) => p.key}
            getItemLayout={getItemLayout}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            onMomentumScrollEnd={onMomentumEnd}
            initialNumToRender={2}
            maxToRenderPerBatch={2}
            windowSize={3}
            bounces={false}
          />
        </Animated.View>
      ) : null}

      {/* ── 0-show year — the friendly start state ────────────────── */}
      {isEmptyYear ? (
        <Animated.View entering={FadeInDown.duration(300)} style={styles.centerFill}>
          <BrandMark />
          <View style={{ height: 24 }} />
          <Text style={styles.emptyTitle}>{`Your ${year} starts\nwith one show`}</Text>
          <View style={{ height: 10 }} />
          <Text style={styles.emptySub}>Log a night and Wrapped starts counting.</Text>
          <View style={{ height: 24 }} />
          <SpringPressable
            onPress={() => router.push('/log/search')}
            haptic="light"
            accessibilityRole="button"
            accessibilityLabel="Log a show"
            style={styles.stageButton}
          >
            <Text style={styles.stageButtonText}>Log a show</Text>
          </SpringPressable>
        </Animated.View>
      ) : null}

      {/* ── Loading / error stage ──────────────────────────────────── */}
      {status === 'loading' ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={c.mute} />
          <View style={{ height: 16 }} />
          <Text style={styles.loadingLabel}>COUNTING YOUR NIGHTS</Text>
        </View>
      ) : null}
      {status === 'error' ? (
        <View style={styles.centerFill}>
          <Text style={styles.emptyTitle}>Couldn’t build your year</Text>
          <View style={{ height: 20 }} />
          <SpringPressable
            onPress={retry}
            haptic="light"
            accessibilityRole="button"
            accessibilityLabel="Retry"
            style={styles.ghostButton}
          >
            <Text style={styles.ghostButtonText}>Retry</Text>
          </SpringPressable>
        </View>
      ) : null}

      {/* ── Screen chrome — OUTSIDE the captured card refs ─────────── */}
      <SpringPressable
        onPress={close}
        haptic="light"
        accessibilityRole="button"
        accessibilityLabel="Close Wrapped"
        style={[styles.chromeButton, { top: insets.top + 8, left: 16 }]}
      >
        <Ionicons name="close" size={22} color={c.fg} />
      </SpringPressable>

      {status === 'ready' && stats && !isEmptyYear ? (
        <>
          {/* Share icon — capture whatever card is on stage. */}
          <SpringPressable
            onPress={() => void shareCurrent()}
            haptic="none"
            accessibilityRole="button"
            accessibilityLabel="Share this card"
            style={[styles.chromeButton, { top: insets.top + 8, right: 16 }]}
          >
            {sharing ? (
              <ActivityIndicator size="small" color={c.fg} />
            ) : (
              <Ionicons name="share-outline" size={20} color={c.fg} />
            )}
          </SpringPressable>

          {/* Page dots — right edge, vertically centered. */}
          <View pointerEvents="none" style={styles.dotsRail}>
            {pages.map((p, i) => (
              <View
                key={`dot-${p.key}`}
                style={[
                  styles.dot,
                  i === page
                    ? { backgroundColor: c.fg, height: 18 }
                    : { backgroundColor: 'rgba(255,255,255,0.25)' },
                ]}
              />
            ))}
          </View>

          {/* Closing-card CTA — chrome, so it never appears in the PNG. */}
          {page === lastPage ? (
            <Animated.View
              entering={FadeInDown.duration(250)}
              style={[styles.ctaWrap, { bottom: insets.bottom + 18 }]}
            >
              <SpringPressable
                onPress={() => void shareCurrent()}
                haptic="none"
                disabled={sharing}
                shakeWhenDisabled={false}
                accessibilityRole="button"
                accessibilityLabel="Share your year"
                style={styles.stageButton}
              >
                {sharing ? (
                  <ActivityIndicator size="small" color={c.inverseFg} />
                ) : (
                  <Text style={styles.stageButtonText}>Share your year</Text>
                )}
              </SpringPressable>
            </Animated.View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

// Stage-fixed styles (dark in both themes) — deliberately NOT useThemedStyles.
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: STAGE_BG,
  },
  fill: { flex: 1 },
  centerFill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: c.fg,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 14,
    fontWeight: '400',
    color: c.mute,
    textAlign: 'center',
  },
  loadingLabel: {
    fontFamily: mono.mono,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 3,
    color: c.muteSoft,
  },
  // Monochrome primary on the dark stage: white pill, near-black label.
  // (PillButton resolves inverseBg from the ACTIVE theme, which would render
  // a black pill on this stage in light mode — hence the local button.)
  stageButton: {
    height: 46,
    minWidth: 200,
    paddingHorizontal: 28,
    borderRadius: 999,
    backgroundColor: c.inverseBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: c.inverseFg,
  },
  ghostButton: {
    height: 40,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: c.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.fg,
  },
  chromeButton: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRail: {
    position: 'absolute',
    right: 10,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  ctaWrap: {
    position: 'absolute',
    left: 32,
    right: 32,
    alignItems: 'center',
  },
});
