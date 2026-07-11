import React, { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, interpolate } from 'react-native-reanimated';

import { radius } from '../../lib/theme';
import { useThemedStyles } from '../../lib/theme-context';

type Props = {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
};

export function Skeleton({ width = '100%', height = 20, borderRadius: br = radius.sm, style }: Props) {
  const styles = useThemedStyles((t) => ({
    skeleton: { backgroundColor: t.colors.card2 },
  }));
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.3, 0.7]),
  }));

  return <Animated.View style={[styles.skeleton, { width: width as any, height, borderRadius: br }, animatedStyle, style]} />;
}

export function FeedCardSkeleton() {
  const styles = useThemedStyles((t) => ({
    feedCard: {
      padding: 16,
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      marginBottom: 16,
    },
    feedHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
  }));

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
