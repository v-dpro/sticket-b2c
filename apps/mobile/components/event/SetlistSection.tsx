import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import type { SetlistSong } from '../../types/event';
import { colors } from '../../lib/theme';

interface SetlistSectionProps {
  songs: SetlistSong[];
  isUpcoming: boolean;
}

export function SetlistSection({ songs, isUpcoming }: SetlistSectionProps) {
  const [revealed, setRevealed] = useState(!isUpcoming);
  const [expanded, setExpanded] = useState(false);

  if (!songs.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Setlist</Text>
        <View style={styles.emptyContainer}>
          <Ionicons name="musical-notes-outline" size={40} color={colors.textLo} />
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
        <Text style={styles.title}>Setlist</Text>
        <Pressable style={styles.spoilerButton} onPress={() => setRevealed(true)}>
          <Ionicons name="eye-off" size={24} color={colors.brandPurple} />
          <Text style={styles.spoilerText}>Reveal Setlist</Text>
          <Text style={styles.spoilerHint}>Tap to see {songs.length} songs</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Setlist</Text>
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
            {song.spotifyUrl ? <FontAwesome name="spotify" size={18} color="#1DB954" /> : null}
          </View>
        ))}

        {encore.length > 0 && expanded ? (
          <>
            <View style={styles.encoreDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.encoreLabel}>Encore</Text>
              <View style={styles.dividerLine} />
            </View>
            {encore.map((song) => (
              <View key={song.id} style={styles.songRow}>
                <Text style={styles.songNumber}>{song.position}</Text>
                <View style={styles.songInfo}>
                  <Text style={styles.songName}>{song.songName}</Text>
                  {song.info ? <Text style={styles.songNote}>{song.info}</Text> : null}
                </View>
                {song.spotifyUrl ? <FontAwesome name="spotify" size={18} color="#1DB954" /> : null}
              </View>
            ))}
          </>
        ) : null}
      </View>

      {songs.length > 5 ? (
        <Pressable style={styles.expandButton} onPress={() => setExpanded(!expanded)}>
          <Text style={styles.expandText}>{expanded ? 'Show less' : `Show all ${songs.length} songs`}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.brandCyan} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textHi,
  },
  count: {
    fontSize: 14,
    color: colors.textLo,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textLo,
    marginTop: 8,
  },
  spoilerButton: {
    alignItems: 'center',
    paddingVertical: 32,
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.brandPurple,
    borderStyle: 'dashed',
  },
  spoilerText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.brandPurple,
    marginTop: 8,
  },
  spoilerHint: {
    fontSize: 12,
    color: colors.textLo,
    marginTop: 4,
  },
  listContainer: {
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  songNumber: {
    width: 24,
    fontSize: 12,
    color: colors.textLo,
  },
  songInfo: {
    flex: 1,
  },
  songName: {
    fontSize: 14,
    color: colors.textHi,
  },
  songNote: {
    fontSize: 12,
    color: colors.textLo,
    marginTop: 2,
  },
  encoreDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.hairline,
  },
  encoreLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brandPurple,
    marginHorizontal: 12,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
    gap: 4,
  },
  expandText: {
    fontSize: 14,
    color: colors.brandCyan,
  },
});



