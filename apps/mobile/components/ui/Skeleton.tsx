import React, { useEffect } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, interpolate } from 'react-native-reanimated';

import { colors, radius } from '../../lib/theme';

type Props = {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
};

export function Skeleton({ width = '100%', height = 20, borderRadius: br = radius.sm, style }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.3, 0.7]),
  }));

  return <Animated.View style={[styles.skeleton, { width, height, borderRadius: br }, animatedStyle, style]} />;
}

export function FeedCardSkeleton() {
  return (
    <View style={styles.feedCard}>
      <View style={styles.feedHeader}>
        <Skeleton width={40} height={40} borderRadius={20} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Skeleton width="50%" height={14} />
          <Skeleton width="30%" height={12} style={{ marginTop: 4 }} />
        </View>
      </View>
      <Skeleton width="100%" height={200} borderRadius={radius.md} style={{ marginTop: 12 }} />
      <Skeleton width="70%" height={14} style={{ marginTop: 12 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.surfaceElevated,
  },
  feedCard: {
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: 16,
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});



