import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

interface ArtistStatsProps {
  followerCount: number;
  totalLogs: number;
  avgRating?: number;
}

export function ArtistStats({ followerCount, totalLogs, avgRating }: ArtistStatsProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    container: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: t.colors.surface,
      borderRadius: 16,
      marginHorizontal: 16,
      marginTop: 16,
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    stat: {
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    statValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: t.colors.textHi,
      marginTop: 4,
    },
    statLabel: {
      fontSize: 11,
      color: t.colors.textLo,
      marginTop: 2,
    },
    divider: {
      width: 1,
      height: 40,
      backgroundColor: t.colors.hairline,
    },
  }));

  return (
    <View style={styles.container}>
      <View style={styles.stat}>
        <Ionicons name="people" size={20} color={tokens.colors.mute} />
        <Text style={styles.statValue}>{formatNumber(followerCount)}</Text>
        <Text style={styles.statLabel}>followers</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.stat}>
        <Ionicons name="musical-notes" size={20} color={tokens.colors.mute} />
        <Text style={styles.statValue}>{formatNumber(totalLogs)}</Text>
        <Text style={styles.statLabel}>times logged</Text>
      </View>

      {avgRating !== undefined && avgRating !== null ? (
        <>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Ionicons name="star" size={20} color={tokens.colors.warning} />
            <Text style={styles.statValue}>{avgRating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>avg rating</Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}



