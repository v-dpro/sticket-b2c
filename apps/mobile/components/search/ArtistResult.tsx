import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import type { ArtistResult as ArtistResultType } from '../../types/search';
import { spacing } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { haptics } from '../../lib/motion';

interface ArtistResultProps {
  artist: ArtistResultType;
  onPress?: () => void;
}

export function ArtistResult({ artist, onPress }: ArtistResultProps) {
  const router = useRouter();
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.hairline,
    },
    image: {
      width: 48,
      height: 48,
      borderRadius: 24,
      marginRight: spacing.md - 4,
    },
    imagePlaceholder: {
      backgroundColor: 'rgba(139, 92, 246, 0.12)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    info: {
      flex: 1,
    },
    name: {
      fontSize: 16,
      fontWeight: '800',
      color: t.colors.textHi,
    },
    genres: {
      fontSize: 13,
      color: t.colors.textLo,
      marginTop: 2,
    },
    upcomingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      gap: 4,
    },
    upcomingText: {
      fontSize: 11,
      color: t.colors.success,
      fontWeight: '600',
    },
  }));

  const handlePress = () => {
    haptics.light(); // navigation tick
    onPress?.();
    router.push(`/artist/${artist.id}`);
  };

  return (
    <Pressable style={styles.container} onPress={handlePress} accessibilityRole="button">
      {artist.imageUrl ? (
        <Image source={{ uri: artist.imageUrl }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Ionicons name="person" size={22} color={tokens.colors.mute} />
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {artist.name}
        </Text>
        {artist.genres?.length ? (
          <Text style={styles.genres} numberOfLines={1}>
            {artist.genres.slice(0, 3).join(' • ')}
          </Text>
        ) : null}

        {typeof artist.upcomingEventCount === 'number' && artist.upcomingEventCount > 0 ? (
          <View style={styles.upcomingBadge}>
            <Ionicons name="calendar" size={10} color={tokens.colors.success} />
            <Text style={styles.upcomingText}>{artist.upcomingEventCount} upcoming</Text>
          </View>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={18} color={tokens.colors.textLo} />
    </Pressable>
  );
}
