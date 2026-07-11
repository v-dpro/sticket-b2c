// FeedSkeleton — loading placeholder matching the ShowCard v2 layout:
// full-bleed post with 36px avatar header, square media, action row,
// caption title + line. Retokened to useTheme() (card / card2 / line).

import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import type { ThemeTokens } from '../../lib/theme';
import { useThemedStyles } from '../../lib/theme-context';

export function FeedSkeleton() {
  const { width } = useWindowDimensions();
  const styles = useThemedStyles(buildStyles);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [progress]);

  const pulse = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.4, 0.8]),
  }));

  return (
    <View style={styles.container} accessibilityLabel="Loading feed">
      {[1, 2].map((i) => (
        <Animated.View key={i} style={[styles.card, pulse]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.avatar} />
            <View style={styles.headerText}>
              <View style={styles.nameLine} />
              <View style={styles.metaLine} />
            </View>
          </View>

          {/* Square media */}
          <View style={[styles.media, { height: Math.min(width, 480) }]} />

          {/* Action row */}
          <View style={styles.actions}>
            <View style={styles.actionDot} />
            <View style={styles.actionDot} />
            <View style={styles.actionDot} />
          </View>

          {/* Caption */}
          <View style={styles.captionTitle} />
          <View style={styles.captionLine} />
        </Animated.View>
      ))}
    </View>
  );
}

const buildStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    container: {
      paddingTop: 4,
    },
    card: {
      backgroundColor: tokens.colors.card,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: tokens.colors.hairline,
      marginBottom: 12,
      paddingBottom: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 56,
      paddingHorizontal: 14,
      marginVertical: 4,
      gap: 10,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: tokens.colors.card2,
    },
    headerText: {
      flex: 1,
      gap: 6,
    },
    nameLine: {
      width: 130,
      height: 12,
      borderRadius: 4,
      backgroundColor: tokens.colors.card2,
    },
    metaLine: {
      width: 150,
      height: 9,
      borderRadius: 3,
      backgroundColor: tokens.colors.card2,
    },
    media: {
      width: '100%',
      backgroundColor: tokens.colors.card2,
    },
    actions: {
      flexDirection: 'row',
      gap: 16,
      paddingHorizontal: 14,
      paddingTop: 14,
    },
    actionDot: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: tokens.colors.card2,
    },
    captionTitle: {
      width: '55%',
      height: 20,
      borderRadius: 6,
      backgroundColor: tokens.colors.card2,
      marginHorizontal: 14,
      marginTop: 14,
    },
    captionLine: {
      width: '80%',
      height: 12,
      borderRadius: 4,
      backgroundColor: tokens.colors.card2,
      marginHorizontal: 14,
      marginTop: 8,
    },
  });
