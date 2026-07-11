// SetlistShield — spoiler-shielded setlist. Songs render underneath a
// blur overlay until the viewer explicitly reveals them.

import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';

import type { SetlistSong } from '../../types/event';
import { haptics } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { PillButton } from '../ui/PillButton';

export function SetlistShield({ songs }: { songs: SetlistSong[] }) {
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

  return (
    <View style={styles.card}>
      <View style={styles.inner}>
        {songs.map((song) => (
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
            {songs.length} songs · spoilers ahead
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
