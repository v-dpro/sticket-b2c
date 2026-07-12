// TimelineHeader — compact pinned profile header above the timeline.
// Avatar 56 · display name (800) · @username + city (mute) · stats row
// (mono, tabular numerals, uppercase letterspaced labels) · white Log pill
// · settings gear · edit chip.

import React from 'react';
import { Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { PillButton } from '../ui/PillButton';
import { SpringPressable } from '../ui/SpringPressable';

export type TimelineHeaderStats = {
  shows: number | null;
  artists: number | null;
  venues: number | null;
  /** Computed client-side from loaded entries; null when nothing scored yet. */
  avgScore: number | null;
};

type TimelineHeaderProps = {
  displayName: string;
  username: string | null;
  city: string | null;
  avatarUrl: string | null;
  stats: TimelineHeaderStats;
  onSettings: () => void;
  onEdit: () => void;
  /** Primary log entry point — the FAB was removed from the tab bar. */
  onLog: () => void;
};

const AVATAR_SIZE = 56;

function statValue(value: number | null, digits = 0): string {
  if (value === null) return '—';
  return digits > 0 ? value.toFixed(digits) : String(value);
}

export function TimelineHeader({
  displayName,
  username,
  city,
  avatarUrl,
  stats,
  onSettings,
  onEdit,
  onLog,
}: TimelineHeaderProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    container: {
      paddingHorizontal: t.density.pad,
      paddingTop: 10,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.hairline,
      backgroundColor: t.colors.bg,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    avatar: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: AVATAR_SIZE / 2,
      backgroundColor: t.colors.card2,
    },
    avatarFallback: {
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    avatarInitial: {
      fontSize: 20,
      fontWeight: '800',
      color: t.colors.mute,
    },
    name: {
      fontSize: 18,
      fontWeight: '800',
      color: t.colors.fg,
    },
    sub: {
      fontSize: 13,
      fontWeight: '400',
      color: t.colors.mute,
      marginTop: 2,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    gear: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      flexWrap: 'wrap',
      marginTop: 14,
      columnGap: 8,
    },
    statText: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 13,
      fontWeight: '600',
      color: t.colors.fg,
    },
    statLabel: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10,
      fontWeight: '500',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    statDot: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 11,
      color: t.colors.muteSoft,
    },
  }));

  const initial = (displayName.trim()[0] ?? 'U').toUpperCase();
  const subParts = [username ? `@${username}` : null, city].filter(Boolean);

  const cells: { key: string; value: string; label: string }[] = [
    { key: 'shows', value: statValue(stats.shows), label: 'shows' },
    { key: 'artists', value: statValue(stats.artists), label: 'artists' },
    { key: 'venues', value: statValue(stats.venues), label: 'venues' },
    { key: 'avg', value: statValue(stats.avgScore, 1), label: 'avg' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={styles.avatar}
            contentFit="cover"
            transition={80}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          {subParts.length > 0 ? (
            <Text style={styles.sub} numberOfLines={1}>
              {subParts.join(' · ')}
            </Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <PillButton title="+ Log" variant="primary" size="sm" onPress={onLog} springFeedback haptic="medium" />
          <PillButton title="Edit" variant="secondary" size="sm" onPress={onEdit} springFeedback />
          <SpringPressable
            onPress={onSettings}
            haptic="light"
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            style={styles.gear}
          >
            <Ionicons name="settings-outline" size={20} color={tokens.colors.mute} />
          </SpringPressable>
        </View>
      </View>

      <View style={styles.statsRow} accessibilityRole="text">
        {cells.map((cell, i) => (
          <React.Fragment key={cell.key}>
            {i > 0 ? <Text style={styles.statDot}>·</Text> : null}
            <Text style={styles.statText}>
              {cell.value}
              <Text style={styles.statLabel}> {cell.label}</Text>
            </Text>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}
