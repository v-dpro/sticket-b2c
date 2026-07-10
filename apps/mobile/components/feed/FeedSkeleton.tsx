// FeedSkeleton — loading placeholder matching the ShowCard layout:
// full-bleed post with 56px header, square media, action row, caption.

import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '../../lib/theme';

export function FeedSkeleton() {
  const { width } = useWindowDimensions();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [progress]);

  const pulse = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.35, 0.65]),
  }));

  return (
    <View style={styles.container} accessibilityLabel="Loading feed">
      {[1, 2].map((i) => (
        <Animated.View key={i} style={[styles.card, pulse]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.avatar} />
            <View style={styles.headerText}>
              <View style={styles.eyebrowLine} />
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

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.hairline,
    marginBottom: 12,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 14,
    marginVertical: 4,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.hairline,
    marginRight: 10,
  },
  headerText: {
    flex: 1,
    gap: 5,
  },
  eyebrowLine: {
    width: 70,
    height: 7,
    borderRadius: 3,
    backgroundColor: colors.hairline,
  },
  nameLine: {
    width: 110,
    height: 11,
    borderRadius: 4,
    backgroundColor: colors.hairline,
  },
  metaLine: {
    width: 150,
    height: 8,
    borderRadius: 3,
    backgroundColor: colors.hairline,
  },
  media: {
    width: '100%',
    backgroundColor: colors.elevated,
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
    backgroundColor: colors.hairline,
  },
  captionTitle: {
    width: '55%',
    height: 18,
    borderRadius: 4,
    backgroundColor: colors.hairline,
    marginHorizontal: 14,
    marginTop: 14,
  },
  captionLine: {
    width: '80%',
    height: 10,
    borderRadius: 4,
    backgroundColor: colors.hairline,
    marginHorizontal: 14,
    marginTop: 8,
  },
});
