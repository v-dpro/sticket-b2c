// components/timeline/deckFaces.tsx — the MemoryDeck's faces, shared.
// The Timeline tab and other-user profiles both spin the SAME wheel: photo-
// backed PlanCards for plans, fill-the-stage MemoryCards for logged nights,
// torn ticket-end strips in the before/after slots, and the mono month
// readout. This module owns those faces so the two screens can't drift —
// the tab keeps its own chrome (snap-to-today bus, AgendaPin, big month
// header); a profile shows the deck's built-in compact readout.

import React, { useCallback } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';

import type { TimelineEntry, TimelineMonth, TimelineUpcomingItem } from '../../lib/api/timeline';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { StubPerforation } from '../ui/Stub';
import { CompactLogRow } from './CompactLogRow';
import { MemoryCard } from './MemoryCard';
import { CARD_INSET, type DeckItem } from './MemoryDeck';
import { PlanCard } from './PlanCard';
import { countdownLabel, formatShortDate, monthLabel } from './format';

/** The timeline always shows photos: memory photos when they exist,
    otherwise the tour/event/artist image stands in. Only an entry with
    no image at all falls back to the quiet row. */
export function isMemoryEntry(entry: TimelineEntry): boolean {
  return (
    entry.photos.length > 0 ||
    Boolean(entry.fallbackImageUrl) ||
    Boolean(entry.artist.imageUrl)
  );
}

export function fallbackUriFor(entry: TimelineEntry): string | undefined {
  return entry.fallbackImageUrl ?? entry.artist.imageUrl ?? undefined;
}

/** Append a timeline page, merging a month split across the page boundary. */
export function mergeMonths(prev: TimelineMonth[], next: TimelineMonth[]): TimelineMonth[] {
  if (prev.length === 0) return next;
  const merged = prev.map((m) => ({ ...m, entries: [...m.entries] }));
  for (const month of next) {
    const last = merged[merged.length - 1];
    if (last && last.key === month.key) {
      last.entries.push(...month.entries);
    } else {
      merged.push({ ...month, entries: [...month.entries] });
    }
  }
  return merged;
}

/** Timeline response → chronological deck: furthest plan first, then past
    entries newest→oldest — so the wheel spins from future into history. */
export function buildDeckItems(
  upcoming: TimelineUpcomingItem[],
  months: TimelineMonth[],
): DeckItem[] {
  const out: DeckItem[] = [];
  for (let i = upcoming.length - 1; i >= 0; i--) {
    const item = upcoming[i]!;
    out.push({
      kind: 'plan',
      key: `plan-${item.type}-${item.id}`,
      item,
      monthKey: item.event.date.slice(0, 7),
    });
  }
  for (const month of months) {
    for (const entry of month.entries) {
      out.push({ kind: 'entry', key: `log-${entry.logId}`, entry, monthKey: month.key });
    }
  }
  return out;
}

/** The deck's three render props — card, torn-end label, month readout —
    with navigation baked in (log page, event page, party page). */
export function useDeckFaces(): {
  renderCard: (item: DeckItem, isCentered: boolean, cardMaxH: number) => React.ReactNode;
  renderLabel: (item: DeckItem, edge: 'top' | 'bottom') => React.ReactNode;
  readoutFor: (item: DeckItem) => string;
} {
  const router = useRouter();
  const { tokens } = useTheme();
  const { width: windowWidth } = useWindowDimensions();

  const styles = useThemedStyles((t) => ({
    // Torn ticket ends — the strip is card-built (fill + hairline) with
    // its outer corners rounded and the torn edge square against the card.
    stubEnd: {
      flex: 1,
      backgroundColor: t.colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.hairline,
      overflow: 'hidden', // clips the notch punches into side bites
    },
    stubEndTop: { borderTopLeftRadius: 14, borderTopRightRadius: 14 },
    stubEndBottom: { borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
    stubEndBody: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      paddingHorizontal: 16,
    },
    deckLabelName: { fontSize: 15, fontWeight: '700', color: t.colors.fg, textAlign: 'center' },
    deckLabelMeta: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 10.5,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
      textAlign: 'center',
    },
  }));

  const openLog = useCallback(
    (logId: string) => router.push({ pathname: '/log/[id]', params: { id: logId } }),
    [router],
  );
  const openEvent = useCallback(
    (eventId: string) => router.push({ pathname: '/event/[eventId]', params: { eventId } }),
    [router],
  );

  const readoutFor = useCallback((item: DeckItem) => {
    const label = monthLabel(item.monthKey);
    return item.kind === 'plan' ? `UPCOMING · ${label}` : label;
  }, []);

  const renderCard = useCallback(
    (item: DeckItem, _centered: boolean, cardMaxH: number) => {
      const cardW = windowWidth - CARD_INSET * 2;
      if (item.kind === 'plan') {
        // A plan with a party honors its "TAP TO JOIN" line. On the wheel
        // it's photo-backed (tour art) like every other night — no details
        // strip, so the photo gets the whole height budget.
        const party = item.item.party;
        return (
          <PlanCard
            item={item.item}
            photoAspect={
              cardMaxH > 300 ? Math.min(0.9, Math.max(0.5, cardW / cardMaxH)) : 0.78
            }
            onPress={() =>
              party ? router.push(`/party/${party.id}`) : openEvent(item.item.event.id)
            }
          />
        );
      }
      if (isMemoryEntry(item.entry)) {
        // The photo IS the content: it takes every pixel the stage offers
        // above the ~50px details strip, instead of floating in dead space.
        const photoAspect =
          cardMaxH > 300 ? Math.min(0.9, Math.max(0.5, cardW / (cardMaxH - 50))) : 0.78;
        return (
          <MemoryCard
            entry={item.entry}
            onPress={() => openLog(item.entry.logId)}
            photoAspect={photoAspect}
            fallbackUri={fallbackUriFor(item.entry)}
          />
        );
      }
      return <CompactLogRow entry={item.entry} onPress={() => openLog(item.entry.logId)} />;
    },
    [openEvent, openLog, router, windowWidth],
  );

  // The before/after slots are TORN TICKET ENDS: card-colored strips the
  // width of the card, perforation facing center — the deck reads as one
  // continuous roll of tickets with the current night torn out large.
  const renderLabel = useCallback(
    (item: DeckItem, edge: 'top' | 'bottom') => {
      const name = item.kind === 'plan' ? item.item.event.name : item.entry.artist.name;
      const meta =
        item.kind === 'plan'
          ? [item.item.event.venue?.name, countdownLabel(item.item.event.date)]
              .filter(Boolean)
              .join(' · ')
          : [item.entry.venue.name, formatShortDate(item.entry.event.date)]
              .filter(Boolean)
              .join(' · ');
      return (
        <View
          style={[styles.stubEnd, edge === 'top' ? styles.stubEndTop : styles.stubEndBottom]}
        >
          {edge === 'bottom' ? <StubPerforation notchColor={tokens.colors.bg} /> : null}
          <View style={styles.stubEndBody}>
            <Text style={styles.deckLabelName} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.deckLabelMeta} numberOfLines={1}>
              {meta}
            </Text>
          </View>
          {edge === 'top' ? <StubPerforation notchColor={tokens.colors.bg} /> : null}
        </View>
      );
    },
    [styles, tokens],
  );

  return { renderCard, renderLabel, readoutFor };
}
