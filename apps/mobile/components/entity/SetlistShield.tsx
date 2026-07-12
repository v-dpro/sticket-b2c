// SetlistShield — spoiler-shielded setlist. Songs render underneath a
// blur overlay until the viewer explicitly reveals them.
//
// Two data shapes:
//   `songs`   — legacy static setlist (position + name + encore tag).
//   `entries` — crowd-sourced entries (position + title + net confirmCount)
//               with tap-to-vote ✓/✗ toggles (POST /setlist-entries/:id/confirm
//               via the `onVote` callback — the owner screen holds the state).

import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';

import type { SetlistEntry } from '../../lib/api/events';
import type { SetlistSong } from '../../types/event';
import { haptics } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { PillButton } from '../ui/PillButton';
import { SpringPressable } from '../ui/SpringPressable';

type SetlistShieldProps = {
  /** Legacy static setlist rows. */
  songs?: SetlistSong[];
  /** Crowd-sourced entries (rendered with confirmCount + vote toggles). */
  entries?: SetlistEntry[];
  /** Vote handler for crowd entries — owner screen POSTs and updates state. */
  onVote?: (entryId: string, vote: 'yes' | 'no') => void;
};

export function SetlistShield({ songs = [], entries = [], onVote }: SetlistShieldProps) {
  const [revealed, setRevealed] = useState(false);
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    card: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.hairline,
      overflow: 'hidden',
    },
    inner: { paddingVertical: 8 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: t.density.cardPad,
      paddingVertical: 8,
    },
    position: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 11,
      color: t.colors.muteSoft,
      width: 20,
      textAlign: 'right',
    },
    song: { flex: 1, fontSize: 14, fontWeight: '400', color: t.colors.text },
    encore: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 9,
      letterSpacing: 1,
      color: t.colors.mute,
      backgroundColor: t.colors.card2,
      borderRadius: t.radius.full,
      paddingHorizontal: 8,
      paddingVertical: 3,
      overflow: 'hidden',
    },
    confirmCount: {
      fontFamily: t.fontFamilies.mono,
      fontVariant: ['tabular-nums'],
      fontSize: 10.5,
      letterSpacing: 0.5,
      color: t.colors.mute,
      minWidth: 22,
      textAlign: 'right',
    },
    voteButton: {
      width: 26,
      height: 26,
      borderRadius: t.radius.full,
      backgroundColor: t.colors.card2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    voteButtonActive: { backgroundColor: t.colors.inverseBg },
    shield: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    shieldLabel: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 11,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
  }));

  const handleReveal = () => {
    haptics.light();
    setRevealed(true);
  };

  const crowd = entries.length > 0;
  const rowCount = crowd ? entries.length : songs.length;

  return (
    <View style={styles.card}>
      <View style={styles.inner}>
        {crowd
          ? entries.map((entry) => {
              const yes = entry.yourVote === 'YES';
              const no = entry.yourVote === 'NO';
              return (
                <View key={entry.id} style={styles.row}>
                  <Text style={styles.position}>{entry.position}</Text>
                  <Text style={styles.song} numberOfLines={1}>
                    {entry.songTitle}
                  </Text>
                  <Text style={styles.confirmCount}>
                    {entry.confirmCount > 0 ? `+${entry.confirmCount}` : entry.confirmCount}
                  </Text>
                  <SpringPressable
                    haptic="light"
                    onPress={() => onVote?.(entry.id, 'yes')}
                    accessibilityRole="button"
                    accessibilityLabel={`Confirm ${entry.songTitle} was played`}
                    accessibilityState={{ selected: yes }}
                    style={[styles.voteButton, yes && styles.voteButtonActive]}
                  >
                    <Ionicons
                      name="checkmark"
                      size={14}
                      color={yes ? tokens.colors.inverseFg : tokens.colors.mute}
                    />
                  </SpringPressable>
                  <SpringPressable
                    haptic="light"
                    onPress={() => onVote?.(entry.id, 'no')}
                    accessibilityRole="button"
                    accessibilityLabel={`Dispute ${entry.songTitle}`}
                    accessibilityState={{ selected: no }}
                    style={[styles.voteButton, no && styles.voteButtonActive]}
                  >
                    <Ionicons
                      name="close"
                      size={14}
                      color={no ? tokens.colors.inverseFg : tokens.colors.mute}
                    />
                  </SpringPressable>
                </View>
              );
            })
          : songs.map((song) => (
              <View key={song.id} style={styles.row}>
                <Text style={styles.position}>{song.position}</Text>
                <Text style={styles.song} numberOfLines={1}>
                  {song.songName}
                </Text>
                {song.isEncore ? <Text style={styles.encore}>ENCORE</Text> : null}
              </View>
            ))}
      </View>

      {!revealed ? (
        <BlurView
          intensity={26}
          tint={tokens.isDark ? 'dark' : 'light'}
          style={styles.shield}
        >
          <Text style={styles.shieldLabel}>
            {rowCount} songs · spoilers ahead
          </Text>
          <PillButton
            title="Reveal setlist"
            variant="secondary"
            springFeedback
            haptic="light"
            onPress={handleReveal}
          />
        </BlurView>
      ) : null}
    </View>
  );
}
