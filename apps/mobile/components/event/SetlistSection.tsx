import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import type { SetlistSong } from '../../types/event';
import { radius, fontFamilies } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

interface SetlistSectionProps {
  songs: SetlistSong[];
  isUpcoming: boolean;
}

export function SetlistSection({ songs, isUpcoming }: SetlistSectionProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    container: {
      paddingTop: 24,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      marginBottom: 10,
      gap: 8,
    },
    sectionLabel: {
      fontFamily: fontFamilies.monoMedium,
      fontSize: 10.5,
      fontWeight: '500',
      letterSpacing: 2,
      color: t.colors.textLo,
    },
    count: {
      fontSize: 12,
      color: t.colors.textLo,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: 28,
      marginHorizontal: 16,
      backgroundColor: t.colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    emptyText: {
      fontSize: 13,
      color: t.colors.textLo,
      marginTop: 8,
    },
    spoilerButton: {
      alignItems: 'center',
      paddingVertical: 28,
      marginHorizontal: 16,
      backgroundColor: t.colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: t.colors.brandCyan,
      borderStyle: 'dashed',
    },
    spoilerText: {
      fontSize: 15,
      fontWeight: '600',
      color: t.colors.brandCyan,
      marginTop: 8,
    },
    spoilerHint: {
      fontSize: 12,
      color: t.colors.textLo,
      marginTop: 4,
    },
    listContainer: {
      marginHorizontal: 16,
      backgroundColor: t.colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      overflow: 'hidden',
    },
    songRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 11,
      paddingHorizontal: 14,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.hairline,
    },
    songNumber: {
      fontFamily: fontFamilies.mono,
      width: 26,
      fontSize: 11,
      color: t.colors.textLo,
    },
    songInfo: {
      flex: 1,
    },
    songName: {
      fontSize: 14,
      color: t.colors.textHi,
    },
    songNote: {
      fontSize: 12,
      color: t.colors.textLo,
      marginTop: 2,
    },
    encoreDivider: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: t.colors.hairline,
    },
    encoreLabel: {
      fontFamily: fontFamilies.monoSemi,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 1.5,
      color: t.colors.brandCyan,
      marginHorizontal: 10,
    },
    expandButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      marginHorizontal: 16,
      marginTop: 6,
      gap: 4,
    },
    expandText: {
      fontSize: 13,
      color: t.colors.brandCyan,
    },
  }));

  const [revealed, setRevealed] = useState(!isUpcoming);
  const [expanded, setExpanded] = useState(false);

  if (!songs.length) {
    return (
      <View style={styles.container}>
        <Text style={[styles.sectionLabel, { paddingHorizontal: 16 }]}>SETLIST</Text>
        <View style={styles.emptyContainer}>
          <Ionicons name="musical-notes-outline" size={32} color={tokens.colors.textLo} />
          <Text style={styles.emptyText}>No setlist available</Text>
        </View>
      </View>
    );
  }

  const mainSet = songs.filter((s) => !s.isEncore);
  const encore = songs.filter((s) => s.isEncore);

  if (!revealed) {
    return (
      <View style={styles.container}>
        <Text style={[styles.sectionLabel, { paddingHorizontal: 16 }]}>SETLIST</Text>
        <Pressable style={styles.spoilerButton} onPress={() => setRevealed(true)}>
          <Ionicons name="eye-off" size={22} color={tokens.colors.brandCyan} />
          <Text style={styles.spoilerText}>Reveal Setlist</Text>
          <Text style={styles.spoilerHint}>Tap to see {songs.length} songs</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionLabel}>SETLIST</Text>
        <Text style={styles.count}>{songs.length} songs</Text>
      </View>

      <View style={styles.listContainer}>
        {mainSet.slice(0, expanded ? undefined : 5).map((song) => (
          <View key={song.id} style={styles.songRow}>
            <Text style={styles.songNumber}>{song.position}</Text>
            <View style={styles.songInfo}>
              <Text style={styles.songName}>{song.songName}</Text>
              {song.info ? <Text style={styles.songNote}>{song.info}</Text> : null}
            </View>
            {/* Spotify brand green — fixed brand-logo color */}
            {song.spotifyUrl ? <FontAwesome name="spotify" size={16} color="#1DB954" /> : null}
          </View>
        ))}

        {encore.length > 0 && expanded ? (
          <>
            <View style={styles.encoreDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.encoreLabel}>ENCORE</Text>
              <View style={styles.dividerLine} />
            </View>
            {encore.map((song) => (
              <View key={song.id} style={styles.songRow}>
                <Text style={styles.songNumber}>{song.position}</Text>
                <View style={styles.songInfo}>
                  <Text style={styles.songName}>{song.songName}</Text>
                  {song.info ? <Text style={styles.songNote}>{song.info}</Text> : null}
                </View>
                {song.spotifyUrl ? <FontAwesome name="spotify" size={16} color="#1DB954" /> : null}
              </View>
            ))}
          </>
        ) : null}
      </View>

      {songs.length > 5 ? (
        <Pressable style={styles.expandButton} onPress={() => setExpanded(!expanded)}>
          <Text style={styles.expandText}>{expanded ? 'Show less' : `Show all ${songs.length} songs`}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={tokens.colors.brandCyan} />
        </Pressable>
      ) : null}
    </View>
  );
}
