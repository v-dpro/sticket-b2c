// SharedHistoryCard — "YOU × {NAME}" overlap card on another user's profile
// (Phase A13). Collapsed: mono stat line (N SHOWS TOGETHER · N SHARED
// ARTISTS). Tap → expands into the side-by-side score table: one row per
// shared event with mono YOU | THEM score columns ("—" when unscored);
// tapping a row opens the event. Renders nothing when there is no overlap —
// the parent screen only mounts it when sharedCount > 0.
//
// Design bible: useTheme() tokens only (both modes), system 800/600/400 +
// mono for data, monochrome card2 pills, SpringPressable + haptics.

import React, { useCallback, useState } from 'react';
import { LayoutAnimation, Platform, Text, UIManager, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { SharedHistory, SharedHistoryEntry } from '../../lib/api/profile';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';
import { formatScore } from '../timeline/format';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SCORE_COL_WIDTH = 44;

interface SharedHistoryCardProps {
  /** The other user's display name (first word is used: "YOU × ALEX"). */
  name: string;
  shared: SharedHistory;
  onEntryPress: (entry: SharedHistoryEntry) => void;
}

function scoreLabel(score: number | null): string {
  return typeof score === 'number' ? formatScore(score) : '—';
}

function rowDateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
}

export function SharedHistoryCard({ name, shared, onEntryPress }: SharedHistoryCardProps) {
  const { tokens } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const styles = useThemedStyles((t) => ({
    container: {
      marginHorizontal: 16,
      marginTop: 4,
      marginBottom: 12,
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      overflow: 'hidden',
    },
    header: {
      paddingHorizontal: t.density.cardPad,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerText: {
      flex: 1,
      gap: 4,
    },
    title: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 1.5,
      color: t.colors.fg,
    },
    stats: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'] as const,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 1.2,
      color: t.colors.mute,
    },
    // Table
    table: {
      borderTopWidth: 1,
      borderTopColor: t.colors.hairline,
    },
    columnsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: t.density.cardPad,
      paddingTop: 10,
      paddingBottom: 6,
    },
    columnLabel: {
      width: SCORE_COL_WIDTH,
      textAlign: 'right' as const,
      fontFamily: t.fontFamilies.mono,
      fontSize: 9,
      fontWeight: '600',
      letterSpacing: 1.2,
      color: t.colors.muteSoft,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: t.density.cardPad,
      paddingVertical: 10,
    },
    rowDivider: {
      borderTopWidth: 1,
      borderTopColor: t.colors.lineSoft,
    },
    rowText: {
      flex: 1,
      paddingRight: 10,
      gap: 3,
    },
    eventName: {
      fontSize: 14,
      fontWeight: '600',
      color: t.colors.text,
    },
    eventMeta: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'] as const,
      fontSize: 10,
      fontWeight: '400',
      letterSpacing: 0.8,
      color: t.colors.mute,
    },
    score: {
      width: SCORE_COL_WIDTH,
      textAlign: 'right' as const,
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'] as const,
      fontSize: 13,
      fontWeight: '600',
      color: t.colors.fg,
    },
    scoreEmpty: {
      color: t.colors.muteSoft,
    },
  }));

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  }, []);

  if (shared.sharedCount <= 0) return null;

  const firstName = (name.trim().split(/\s+/)[0] || name).toUpperCase();
  const statParts = [`${shared.sharedCount} SHOW${shared.sharedCount === 1 ? '' : 'S'} TOGETHER`];
  if (shared.artistOverlap > 0) {
    statParts.push(`${shared.artistOverlap} SHARED ARTIST${shared.artistOverlap === 1 ? '' : 'S'}`);
  }

  return (
    <View style={styles.container}>
      <SpringPressable
        onPress={toggle}
        haptic="light"
        style={styles.header}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`Shows with ${name}`}
      >
        <View style={styles.headerText}>
          <Text style={styles.title}>YOU × {firstName}</Text>
          <Text style={styles.stats}>{statParts.join(' · ')}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={tokens.colors.mute} />
      </SpringPressable>

      {expanded ? (
        <View style={styles.table}>
          <View style={styles.columnsRow}>
            <View style={{ flex: 1 }} />
            <Text style={styles.columnLabel}>YOU</Text>
            <Text style={styles.columnLabel}>THEM</Text>
          </View>

          {shared.entries.map((entry, i) => (
            <SpringPressable
              key={entry.eventId}
              onPress={() => onEntryPress(entry)}
              haptic="light"
              style={[styles.row, i > 0 ? styles.rowDivider : null]}
              accessibilityRole="button"
              accessibilityLabel={entry.eventName}
            >
              <View style={styles.rowText}>
                <Text style={styles.eventName} numberOfLines={1}>
                  {entry.eventName}
                </Text>
                <Text style={styles.eventMeta} numberOfLines={1}>
                  {entry.venueName.toUpperCase()} · {rowDateLabel(entry.date)}
                </Text>
              </View>
              <Text style={[styles.score, entry.yourScore == null ? styles.scoreEmpty : null]}>
                {scoreLabel(entry.yourScore)}
              </Text>
              <Text style={[styles.score, entry.theirScore == null ? styles.scoreEmpty : null]}>
                {scoreLabel(entry.theirScore)}
              </Text>
            </SpringPressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
